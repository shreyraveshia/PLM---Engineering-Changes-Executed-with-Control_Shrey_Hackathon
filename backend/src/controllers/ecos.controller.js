/*
One line summary: This is the core of the PLM system — ECOs are created pointing to the
 first stage automatically, draft changes are stored in isolation tables completely 
 separate from master data, and the diff endpoint reads those draft tables to power
  the green/red comparison view

 1. getAll — fetch all ECOs with filters
 2. getById — fetch one ECO with everything attached
 3. create — create a new ECO
 4. saveDraftBom — save proposed BoM changes inside an ECO
 5. saveDraftProduct — save proposed product changes inside an ECO
 6. getDiff — get the comparison view data
*/


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

    /* Why so many JOINs?
    The ECO list page needs to display: ECO title, product name, current stage name, who created it, 
    and BoM version if applicable. All that data lives in different tables. 
    JOINs pull them together in one query instead of making 4 separate requests.
    
    Why LEFT JOIN for boms but regular JOIN for others?
    
    Every ECO must have a product → regular JOIN
    Every ECO must have a stage → regular JOIN
    Every ECO must have a creator → regular JOIN
    A product-type ECO has NO bom_id → LEFT JOIN returns null instead of dropping the row
    */

    const params = [];
    let idx = 1;

    // Two optional filters — status and eco_type — using the same dynamic query building

    if (status) { sql += ` AND e.status = $${idx}`; params.push(status); idx++; }
    if (eco_type) { sql += ` AND e.eco_type = $${idx}`; params.push(eco_type); idx++; }

    sql += ' ORDER BY e.created_at DESC';
    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


/* Six separate queries run for one ECO. 
What each query fetches:

1. ecoResult — the main ECO record with product/stage/user details
2. draftComps — proposed component changes (the diff data)
3. draftOps — proposed operation changes (the diff data)
4. draftProduct — proposed product field changes
5. approvals — who approved at which stage and when
6. allStages — all pipeline stages (needed to render the stage progress bar in UI)*/


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
    // 1. ecoResult — the main ECO record with product/stage/user details

    if (ecoResult.rows.length === 0) {
      return res.status(404).json({ error: `ECO with id ${id} not found` });
    }

    const draftComps = await query(
      'SELECT * FROM eco_draft_components WHERE eco_id = $1 ORDER BY id ASC', [id]
    );
    // 2.draftComps — proposed component changes (the diff data)

    const draftOps = await query(
      'SELECT * FROM eco_draft_operations WHERE eco_id = $1 ORDER BY sequence ASC', [id]
    );
    // 3. draftOps — proposed operation changes (the diff data)


    const draftProduct = await query(
      'SELECT * FROM eco_draft_product WHERE eco_id = $1', [id]
    );
    // 4. draftProduct — proposed product field changes

    // 5. approvals — who approved at which stage and when
    const approvals = await query(
      `SELECT ea.*, u.name AS approver_name, u.role AS approver_role, s.name AS stage_name
       FROM eco_approvals ea
       JOIN users u ON ea.approver_id = u.id
       JOIN eco_stages s ON ea.stage_id = s.id
       WHERE ea.eco_id = $1
       ORDER BY ea.created_at ASC`,
      [id]
    );

    // So ea.* means — select every column from eco_approvals:

    // ea.* is shorthand for "select all columns from the eco_approvals table" — the ea is just 
    // the alias name given to that table.


    // 6. allStages — all pipeline stages (needed to render the stage progress bar in UI)
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
// draftProduct.rows[0] || null — draft_product is at most one row (UNIQUE constraint on eco_id).
// Returns the single object or null if no product draft exists yet.


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
  /*
  Three validation layers:
  Required fields exist
  eco_type is valid
  If BoM type — bom_id must also be provided
  */

  try {
    const productCheck = await query('SELECT id, status FROM products WHERE id = $1', [product_id]);
    if (productCheck.rows.length === 0) return res.status(400).json({ error: 'Product not found' });

    const firstStage = await query('SELECT id FROM eco_stages ORDER BY order_index ASC LIMIT 1');
    if (firstStage.rows.length === 0) {
      return res.status(500).json({ error: 'No ECO stages configured. Please set up stages in Settings first.' });
    }
    /*
    Every ECO starts at the first stage automatically. 
    This query finds whatever stage has the lowest order_index — that's the starting stage. 
    If no stages exist at all, returns a helpful error telling admin to configure stages first.
    */
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
    /* 
    version_update !== undefined ? version_update : true — same boolean handling as stages controller. 
    
    Defaults to true if not provided — meaning by default every ECO will create a new version when approved.
    
    status hardcoded to 'open'. Every new ECO starts as open.
    
    stage_id set to firstStage.rows[0].id — automatically placed in the first stage. */

    const newEco = result.rows[0]; // returns the newly created ECO record.

    await logAudit(ACTIONS.ECO_CREATED, 'eco', newEco.id, null,
      { title: newEco.title, eco_type: newEco.eco_type, product_id: newEco.product_id },
      req.user.id);
    // Logs the creation event.

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


const applyEco = async (ecoId, userId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const ecoResult = await client.query('SELECT * FROM ecos WHERE id = $1', [ecoId]);
    if (ecoResult.rows.length === 0) throw new Error('ECO not found');
    const eco = ecoResult.rows[0];

    if (eco.status === 'applied') throw new Error('ECO is already applied');

    if (eco.eco_type === 'bom') {
      const currentBom = await client.query('SELECT * FROM boms WHERE id = $1', [eco.bom_id]);
      if (currentBom.rows.length === 0) throw new Error('BoM not found');
      const oldBom = currentBom.rows[0];

      await client.query(
        `UPDATE boms SET status = 'archived', updated_at = NOW() WHERE id = $1`,
        [oldBom.id]
      );

      const newVersion = oldBom.version + 1;
      const newBomResult = await client.query(
        `INSERT INTO boms (product_id, version, status, parent_id, notes, created_by)
         VALUES ($1, $2, 'active', $3, $4, $5)
         RETURNING *`,
        [oldBom.product_id, newVersion, oldBom.id,
         `Auto-created by ECO #${ecoId}: ${eco.title}`, userId]
      );
      const newBom = newBomResult.rows[0];

      const draftComps = await client.query(
        'SELECT * FROM eco_draft_components WHERE eco_id = $1', [ecoId]
      );

      for (const comp of draftComps.rows) {
        if (comp.change_type === 'removed') continue;
        const qty = comp.new_quantity !== null ? comp.new_quantity : comp.old_quantity;
        await client.query(
          `INSERT INTO bom_components (bom_id, component_name, quantity, unit)
           VALUES ($1, $2, $3, $4)`,
          [newBom.id, comp.component_name, qty, comp.unit || 'pcs']
        );
      }

      const draftOps = await client.query(
        'SELECT * FROM eco_draft_operations WHERE eco_id = $1 ORDER BY sequence', [ecoId]
      );

      for (const op of draftOps.rows) {
        if (op.change_type === 'removed') continue;
        const time = op.new_time_minutes !== null ? op.new_time_minutes : op.old_time_minutes;
        await client.query(
          `INSERT INTO bom_operations (bom_id, name, time_minutes, work_center, sequence)
           VALUES ($1, $2, $3, $4, $5)`,
          [newBom.id, op.name, time, op.work_center, op.sequence]
        );
      }

      await client.query(
        `UPDATE ecos SET bom_id = $1, status = 'applied', updated_at = NOW() WHERE id = $2`,
        [newBom.id, ecoId]
      );

      await logAudit(ACTIONS.BOM_ARCHIVED, 'bom', oldBom.id,
        { version: oldBom.version, status: 'active' },
        { status: 'archived' }, userId);
      await logAudit(ACTIONS.BOM_VERSIONED, 'bom', newBom.id,
        { parent_id: oldBom.id, version: oldBom.version },
        { version: newVersion, status: 'active' }, userId);
    }

    if (eco.eco_type === 'product') {
      const currentProduct = await client.query('SELECT * FROM products WHERE id = $1', [eco.product_id]);
      if (currentProduct.rows.length === 0) throw new Error('Product not found');
      const oldProduct = currentProduct.rows[0];

      const draftProduct = await client.query(
        'SELECT * FROM eco_draft_product WHERE eco_id = $1', [ecoId]
      );
      const draft = draftProduct.rows[0] || {};

      await client.query(
        `UPDATE products SET status = 'archived', updated_at = NOW() WHERE id = $1`,
        [oldProduct.id]
      );

      const newVersion = oldProduct.version + 1;
      const newProductResult = await client.query(
        `INSERT INTO products (name, sale_price, cost_price, version, status, parent_id, attachment, notes, created_by)
         VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8)
         RETURNING *`,
        [draft.new_name || oldProduct.name,
         draft.new_sale_price !== null ? draft.new_sale_price : oldProduct.sale_price,
         draft.new_cost_price !== null ? draft.new_cost_price : oldProduct.cost_price,
         newVersion, oldProduct.id,
         draft.new_attachment || oldProduct.attachment,
         draft.new_notes || oldProduct.notes,
         userId]
      );
      const newProduct = newProductResult.rows[0];

      await client.query(
        `UPDATE ecos SET product_id = $1, status = 'applied', updated_at = NOW() WHERE id = $2`,
        [newProduct.id, ecoId]
      );

      await logAudit(ACTIONS.PRODUCT_ARCHIVED, 'product', oldProduct.id,
        { version: oldProduct.version, status: 'active' }, { status: 'archived' }, userId);
      await logAudit(ACTIONS.PRODUCT_VERSIONED, 'product', newProduct.id,
        { parent_id: oldProduct.id, version: oldProduct.version },
        { version: newVersion, status: 'active' }, userId);
    }

    await logAudit(ACTIONS.ECO_APPLIED, 'eco', ecoId,
      { status: 'open' }, { status: 'applied' }, userId);

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const approve = async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  try {
    const ecoResult = await query(
      `SELECT e.*, s.requires_approval, s.is_final, s.order_index
       FROM ecos e JOIN eco_stages s ON e.stage_id = s.id
       WHERE e.id = $1`,
      [id]
    );
    if (ecoResult.rows.length === 0) return res.status(404).json({ error: 'ECO not found' });
    const eco = ecoResult.rows[0];

    if (eco.status === 'applied') return res.status(400).json({ error: 'ECO is already applied' });
    if (eco.requires_approval === false) {
      return res.status(400).json({ error: 'This stage does not require approval. Use validate instead.' });
    }

    await query(
      `INSERT INTO eco_approvals (eco_id, stage_id, approver_id, action, notes)
       VALUES ($1, $2, $3, 'approved', $4)`,
      [id, eco.stage_id, req.user.id, notes || null]
    );

    await logAudit(ACTIONS.ECO_APPROVED, 'eco', id,
      { stage_id: eco.stage_id, stage_name: eco.stage_name },
      { approver_id: req.user.id, approver_name: req.user.name },
      req.user.id);

    const nextStage = await query(
      `SELECT * FROM eco_stages WHERE order_index > $1 ORDER BY order_index ASC LIMIT 1`,
      [eco.order_index]
    );

    if (nextStage.rows.length === 0 || eco.is_final) {
      await applyEco(parseInt(id), req.user.id);
      const appliedEco = await query('SELECT * FROM ecos WHERE id = $1', [id]);
      return res.json({ message: 'ECO approved and applied. New version created.', eco: appliedEco.rows[0] });
    }

    const next = nextStage.rows[0];
    await query('UPDATE ecos SET stage_id = $1, updated_at = NOW() WHERE id = $2', [next.id, id]);

    if (next.is_final && !next.requires_approval) {
      await applyEco(parseInt(id), req.user.id);
      const appliedEco = await query('SELECT * FROM ecos WHERE id = $1', [id]);
      return res.json({ message: 'ECO approved and applied. New version created.', eco: appliedEco.rows[0] });
    }

    await logAudit(ACTIONS.ECO_STAGE_MOVED, 'eco', id,
      { from_stage: eco.stage_id }, { to_stage: next.id }, req.user.id);

    const updatedEco = await query('SELECT * FROM ecos WHERE id = $1', [id]);
    return res.json({ message: `ECO moved to stage: ${next.name}`, eco: updatedEco.rows[0] });
  } catch (err) {
    console.error('Approve ECO error:', err);
    return res.status(500).json({ error: err.message });
  }
};

const validate = async (req, res) => {
  const { id } = req.params;

  try {
    const ecoResult = await query(
      `SELECT e.*, s.requires_approval, s.is_final, s.order_index, s.name as stage_name
       FROM ecos e JOIN eco_stages s ON e.stage_id = s.id
       WHERE e.id = $1`,
      [id]
    );
    if (ecoResult.rows.length === 0) return res.status(404).json({ error: 'ECO not found' });
    const eco = ecoResult.rows[0];

    if (eco.status === 'applied') return res.status(400).json({ error: 'ECO is already applied' });
    if (eco.requires_approval) {
      return res.status(400).json({ error: 'This stage requires approval. Use approve instead.' });
    }

    const nextStage = await query(
      `SELECT * FROM eco_stages WHERE order_index > $1 ORDER BY order_index ASC LIMIT 1`,
      [eco.order_index]
    );

    if (nextStage.rows.length === 0 || eco.is_final) {
      await applyEco(parseInt(id), req.user.id);
      const appliedEco = await query('SELECT * FROM ecos WHERE id = $1', [id]);
      return res.json({ message: 'ECO validated and applied. New version created.', eco: appliedEco.rows[0] });
    }

    const next = nextStage.rows[0];
    await query('UPDATE ecos SET stage_id = $1, updated_at = NOW() WHERE id = $2', [next.id, id]);

    if (next.is_final && !next.requires_approval) {
      await applyEco(parseInt(id), req.user.id);
      const appliedEco = await query('SELECT * FROM ecos WHERE id = $1', [id]);
      return res.json({ message: 'ECO validated and applied. New version created.', eco: appliedEco.rows[0] });
    }

    await logAudit(ACTIONS.ECO_VALIDATED, 'eco', id,
      { stage: eco.stage_name }, { next_stage: next.name }, req.user.id);
    await logAudit(ACTIONS.ECO_STAGE_MOVED, 'eco', id,
      { from_stage: eco.stage_id }, { to_stage: next.id }, req.user.id);

    const updatedEco = await query('SELECT * FROM ecos WHERE id = $1', [id]);
    return res.json({ message: `ECO validated and moved to: ${next.name}`, eco: updatedEco.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const cancel = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await query('SELECT * FROM ecos WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'ECO not found' });
    if (existing.rows[0].status === 'applied') return res.status(400).json({ error: 'Cannot cancel an applied ECO' });

    const result = await query(
      `UPDATE ecos SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`, [id]
    );
    await logAudit(ACTIONS.ECO_CANCELLED, 'eco', id,
      { status: existing.rows[0].status }, { status: 'cancelled' }, req.user.id);
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getById, create, saveDraftBom, saveDraftProduct, getDiff, approve, validate, cancel };
