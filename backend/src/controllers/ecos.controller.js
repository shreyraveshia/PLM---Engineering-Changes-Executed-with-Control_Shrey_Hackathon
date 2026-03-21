const { query, getClient } = require('../config/db');
const { logAudit, ACTIONS } = require('../utils/auditLogger');

const getAll = async (req, res) => {
  try {
    const { status, eco_type } = req.query;
    let sql = `
      SELECT e.id, e.title, e.eco_type, e.effective_date, e.version_update,
             e.status, e.description, e.created_at, e.updated_at,
             p.name AS product_name, p.version AS product_version,
             b.version AS bom_version,
             s.name AS stage_name, s.requires_approval, s.is_final, s.order_index,
             u.name AS created_by_name, u.email AS created_by_email,
             e.stage_id, e.product_id, e.bom_id, e.user_id
      FROM ecos e
      JOIN products p ON e.product_id = p.id
      JOIN eco_stages s ON e.stage_id = s.id
      JOIN users u ON e.user_id = u.id
      LEFT JOIN boms b ON e.bom_id = b.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status)   { sql += ` AND e.status = $${idx}`;   params.push(status);   idx++; }
    if (eco_type) { sql += ` AND e.eco_type = $${idx}`; params.push(eco_type); idx++; }

    sql += ' ORDER BY e.created_at DESC';
    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getById = async (req, res) => {
  const { id } = req.params;
  try {
    const ecoResult = await query(
      `SELECT e.*, p.name AS product_name, p.version AS product_version,
              p.sale_price AS product_sale_price, p.cost_price AS product_cost_price,
              b.version AS bom_version,
              s.name AS stage_name, s.requires_approval, s.is_final, s.order_index,
              u.name AS created_by_name
       FROM ecos e
       JOIN products p ON e.product_id = p.id
       JOIN eco_stages s ON e.stage_id = s.id
       JOIN users u ON e.user_id = u.id
       LEFT JOIN boms b ON e.bom_id = b.id
       WHERE e.id = $1`,
      [id]
    );
    if (ecoResult.rows.length === 0) {
      return res.status(404).json({ error: `ECO with id ${id} not found` });
    }

    const draftComps = await query(
      'SELECT * FROM eco_draft_components WHERE eco_id = $1 ORDER BY id ASC', [id]
    );
    const draftOps = await query(
      'SELECT * FROM eco_draft_operations WHERE eco_id = $1 ORDER BY sequence ASC', [id]
    );
    const draftProduct = await query(
      'SELECT * FROM eco_draft_product WHERE eco_id = $1', [id]
    );
    const approvals = await query(
      `SELECT ea.*, u.name AS approver_name, u.role AS approver_role, s.name AS stage_name
       FROM eco_approvals ea
       JOIN users u ON ea.approver_id = u.id
       JOIN eco_stages s ON ea.stage_id = s.id
       WHERE ea.eco_id = $1
       ORDER BY ea.created_at ASC`,
      [id]
    );
    const allStages = await query('SELECT * FROM eco_stages ORDER BY order_index ASC');

    return res.json({
      ...ecoResult.rows[0],
      draft_components: draftComps.rows,
      draft_operations: draftOps.rows,
      draft_product: draftProduct.rows[0] || null,
      approvals: approvals.rows,
      all_stages: allStages.rows
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const create = async (req, res) => {
  const { title, eco_type, product_id, bom_id, effective_date, version_update, description } = req.body;

  if (!title || !eco_type || !product_id) {
    return res.status(400).json({ error: 'title, eco_type, and product_id are required' });
  }
  if (!['product', 'bom'].includes(eco_type)) {
    return res.status(400).json({ error: 'eco_type must be "product" or "bom"' });
  }
  if (eco_type === 'bom' && !bom_id) {
    return res.status(400).json({ error: 'bom_id is required for BoM type ECOs' });
  }

  try {
    const productCheck = await query('SELECT id, status FROM products WHERE id = $1', [product_id]);
    if (productCheck.rows.length === 0) return res.status(400).json({ error: 'Product not found' });

    const firstStage = await query('SELECT id FROM eco_stages ORDER BY order_index ASC LIMIT 1');
    if (firstStage.rows.length === 0) {
      return res.status(500).json({ error: 'No ECO stages configured. Please set up stages in Settings first.' });
    }

    const result = await query(
      `INSERT INTO ecos (title, eco_type, product_id, bom_id, user_id, effective_date, version_update, stage_id, status, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9)
       RETURNING *`,
      [title.trim(), eco_type, parseInt(product_id),
       bom_id ? parseInt(bom_id) : null,
       req.user.id,
       effective_date || null,
       version_update !== undefined ? version_update : true,
       firstStage.rows[0].id,
       description || null]
    );

    const newEco = result.rows[0];
    await logAudit(ACTIONS.ECO_CREATED, 'eco', newEco.id, null,
      { title: newEco.title, eco_type: newEco.eco_type, product_id: newEco.product_id },
      req.user.id);

    return res.status(201).json(newEco);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const saveDraftBom = async (req, res) => {
  const { id } = req.params;
  const { components, operations } = req.body;

  try {
    const ecoCheck = await query('SELECT * FROM ecos WHERE id = $1', [id]);
    if (ecoCheck.rows.length === 0) return res.status(404).json({ error: 'ECO not found' });
    if (ecoCheck.rows[0].status === 'applied') {
      return res.status(400).json({ error: 'Cannot modify an applied ECO' });
    }
    if (ecoCheck.rows[0].eco_type !== 'bom') {
      return res.status(400).json({ error: 'This ECO is not a BoM type ECO' });
    }

    await query('DELETE FROM eco_draft_components WHERE eco_id = $1', [id]);
    await query('DELETE FROM eco_draft_operations WHERE eco_id = $1', [id]);

    if (components && Array.isArray(components)) {
      for (const comp of components) {
        if (!comp.component_name) continue;
        const changeType = comp.change_type ||
          (comp.old_quantity === null ? 'added' :
           comp.new_quantity === null ? 'removed' :
           comp.old_quantity !== comp.new_quantity ? 'modified' : 'unchanged');

        await query(
          `INSERT INTO eco_draft_components
           (eco_id, component_name, old_quantity, new_quantity, unit, change_type)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, comp.component_name.trim(),
           comp.old_quantity !== undefined ? comp.old_quantity : null,
           comp.new_quantity !== undefined ? comp.new_quantity : null,
           comp.unit || 'pcs', changeType]
        );
      }
    }

    if (operations && Array.isArray(operations)) {
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        if (!op.name) continue;
        const changeType = op.change_type ||
          (op.old_time_minutes === null ? 'added' :
           op.new_time_minutes === null ? 'removed' :
           op.old_time_minutes !== op.new_time_minutes ? 'modified' : 'unchanged');

        await query(
          `INSERT INTO eco_draft_operations
           (eco_id, name, old_time_minutes, new_time_minutes, work_center, sequence, change_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, op.name.trim(),
           op.old_time_minutes !== undefined ? op.old_time_minutes : null,
           op.new_time_minutes !== undefined ? op.new_time_minutes : null,
           op.work_center || null, i + 1, changeType]
        );
      }
    }

    await logAudit(ACTIONS.ECO_DRAFT_SAVED, 'eco', id, null,
      { components_count: components?.length, operations_count: operations?.length },
      req.user.id);

    const updatedDraftComps = await query('SELECT * FROM eco_draft_components WHERE eco_id = $1 ORDER BY id', [id]);
    const updatedDraftOps = await query('SELECT * FROM eco_draft_operations WHERE eco_id = $1 ORDER BY sequence', [id]);

    return res.json({
      message: 'Draft BoM changes saved successfully',
      draft_components: updatedDraftComps.rows,
      draft_operations: updatedDraftOps.rows
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const saveDraftProduct = async (req, res) => {
  const { id } = req.params;
  const { new_name, new_sale_price, new_cost_price, new_attachment, new_notes } = req.body;

  try {
    const ecoCheck = await query('SELECT * FROM ecos WHERE id = $1', [id]);
    if (ecoCheck.rows.length === 0) return res.status(404).json({ error: 'ECO not found' });
    if (ecoCheck.rows[0].status === 'applied') return res.status(400).json({ error: 'Cannot modify applied ECO' });
    if (ecoCheck.rows[0].eco_type !== 'product') return res.status(400).json({ error: 'This ECO is not a Product type ECO' });

    const product = await query('SELECT * FROM products WHERE id = $1', [ecoCheck.rows[0].product_id]);
    if (product.rows.length === 0) return res.status(400).json({ error: 'Product not found' });
    const p = product.rows[0];

    await query('DELETE FROM eco_draft_product WHERE eco_id = $1', [id]);

    const result = await query(
      `INSERT INTO eco_draft_product
       (eco_id, old_name, new_name, old_sale_price, new_sale_price, old_cost_price, new_cost_price, old_attachment, new_attachment, old_notes, new_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [id,
       p.name, new_name || p.name,
       p.sale_price, new_sale_price !== undefined ? new_sale_price : p.sale_price,
       p.cost_price, new_cost_price !== undefined ? new_cost_price : p.cost_price,
       p.attachment, new_attachment !== undefined ? new_attachment : p.attachment,
       p.notes, new_notes !== undefined ? new_notes : p.notes]
    );

    await logAudit(ACTIONS.ECO_DRAFT_SAVED, 'eco', id, null, result.rows[0], req.user.id);
    return res.json({ message: 'Draft product changes saved', draft_product: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getDiff = async (req, res) => {
  const { id } = req.params;
  try {
    const ecoResult = await query('SELECT * FROM ecos WHERE id = $1', [id]);
    if (ecoResult.rows.length === 0) return res.status(404).json({ error: 'ECO not found' });
    const eco = ecoResult.rows[0];

    if (eco.eco_type === 'bom') {
      const draftComps = await query('SELECT * FROM eco_draft_components WHERE eco_id = $1 ORDER BY id', [id]);
      const draftOps = await query('SELECT * FROM eco_draft_operations WHERE eco_id = $1 ORDER BY sequence', [id]);
      return res.json({
        type: 'bom',
        eco_id: parseInt(id),
        components: draftComps.rows,
        operations: draftOps.rows
      });
    }

    if (eco.eco_type === 'product') {
      const draftProduct = await query('SELECT * FROM eco_draft_product WHERE eco_id = $1', [id]);
      const currentProduct = await query('SELECT * FROM products WHERE id = $1', [eco.product_id]);
      return res.json({
        type: 'product',
        eco_id: parseInt(id),
        draft: draftProduct.rows[0] || {},
        current: currentProduct.rows[0] || {}
      });
    }

    return res.status(400).json({ error: 'Unknown ECO type' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getById, create, saveDraftBom, saveDraftProduct, getDiff };
