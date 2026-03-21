const { query, getClient } = require('../config/db');
const { logAudit, ACTIONS } = require('../utils/auditLogger');

const getAll = async (req, res) => {
  try {
    const { product_id, status } = req.query;
    let sql = `
      SELECT b.id, b.product_id, b.version, b.status, b.parent_id, b.notes,
             b.created_at, b.updated_at,
             p.name AS product_name, p.version AS product_version, p.status AS product_status,
             u.name AS created_by_name
      FROM boms b
      JOIN products p ON b.product_id = p.id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (product_id) { sql += ` AND b.product_id = $${idx}`; params.push(product_id); idx++; }
    if (status)     { sql += ` AND b.status = $${idx}`;     params.push(status);     idx++; }

    sql += ' ORDER BY b.created_at DESC';
    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getById = async (req, res) => {
  const { id } = req.params;
  try {
    const bomResult = await query(
      `SELECT b.*, p.name AS product_name, p.version AS product_version,
              u.name AS created_by_name
       FROM boms b
       JOIN products p ON b.product_id = p.id
       LEFT JOIN users u ON b.created_by = u.id
       WHERE b.id = $1`,
      [id]
    );
    if (bomResult.rows.length === 0) {
      return res.status(404).json({ error: `BoM with id ${id} not found` });
    }

    const componentsResult = await query(
      'SELECT * FROM bom_components WHERE bom_id = $1 ORDER BY id ASC',
      [id]
    );
    const operationsResult = await query(
      'SELECT * FROM bom_operations WHERE bom_id = $1 ORDER BY sequence ASC',
      [id]
    );

    return res.json({
      ...bomResult.rows[0],
      components: componentsResult.rows,
      operations: operationsResult.rows
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const create = async (req, res) => {
  const { product_id, notes, components, operations } = req.body;

  if (!product_id) {
    return res.status(400).json({ error: 'product_id is required' });
  }
  if (!components || !Array.isArray(components) || components.length === 0) {
    return res.status(400).json({ error: 'At least one component is required' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const productCheck = await client.query(
      'SELECT id, status FROM products WHERE id = $1',
      [product_id]
    );
    if (productCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Product not found' });
    }
    if (productCheck.rows[0].status === 'archived') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot create BoM for an archived product' });
    }

    const bomResult = await client.query(
      `INSERT INTO boms (product_id, version, status, notes, created_by)
       VALUES ($1, 1, 'active', $2, $3)
       RETURNING *`,
      [product_id, notes || null, req.user.id]
    );
    const newBom = bomResult.rows[0];

    for (const comp of components) {
      if (!comp.component_name || !comp.quantity) continue;
      await client.query(
        `INSERT INTO bom_components (bom_id, component_name, quantity, unit)
         VALUES ($1, $2, $3, $4)`,
        [newBom.id, comp.component_name.trim(), parseFloat(comp.quantity), comp.unit || 'pcs']
      );
    }

    if (operations && Array.isArray(operations)) {
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        if (!op.name || !op.time_minutes) continue;
        await client.query(
          `INSERT INTO bom_operations (bom_id, name, time_minutes, work_center, sequence)
           VALUES ($1, $2, $3, $4, $5)`,
          [newBom.id, op.name.trim(), parseFloat(op.time_minutes), op.work_center || null, i + 1]
        );
      }
    }

    await client.query('COMMIT');

    const fullBom = await getById({ params: { id: newBom.id } }, res);
    await logAudit(ACTIONS.BOM_CREATED, 'bom', newBom.id, null, newBom, req.user.id);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create BoM error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

const createBomAndReturn = async (req, res) => {
  const { product_id, notes, components, operations } = req.body;

  if (!product_id) return res.status(400).json({ error: 'product_id is required' });
  if (!components || !Array.isArray(components) || components.length === 0)
    return res.status(400).json({ error: 'At least one component is required' });

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const productCheck = await client.query('SELECT id, status FROM products WHERE id = $1', [product_id]);
    if (productCheck.rows.length === 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Product not found' }); }
    if (productCheck.rows[0].status === 'archived') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Cannot create BoM for archived product' }); }

    const bomResult = await client.query(
      `INSERT INTO boms (product_id, version, status, notes, created_by) VALUES ($1, 1, 'active', $2, $3) RETURNING *`,
      [product_id, notes || null, req.user.id]
    );
    const newBom = bomResult.rows[0];

    for (const comp of components) {
      if (!comp.component_name || !comp.quantity) continue;
      await client.query(
        `INSERT INTO bom_components (bom_id, component_name, quantity, unit) VALUES ($1, $2, $3, $4)`,
        [newBom.id, comp.component_name.trim(), parseFloat(comp.quantity), comp.unit || 'pcs']
      );
    }

    if (operations && Array.isArray(operations)) {
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        if (!op.name || !op.time_minutes) continue;
        await client.query(
          `INSERT INTO bom_operations (bom_id, name, time_minutes, work_center, sequence) VALUES ($1, $2, $3, $4, $5)`,
          [newBom.id, op.name.trim(), parseFloat(op.time_minutes), op.work_center || null, i + 1]
        );
      }
    }

    await client.query('COMMIT');

    const comps = await query('SELECT * FROM bom_components WHERE bom_id = $1 ORDER BY id', [newBom.id]);
    const ops = await query('SELECT * FROM bom_operations WHERE bom_id = $1 ORDER BY sequence', [newBom.id]);
    const prod = await query('SELECT name, version FROM products WHERE id = $1', [product_id]);

    await logAudit(ACTIONS.BOM_CREATED, 'bom', newBom.id, null, newBom, req.user.id);

    return res.status(201).json({
      ...newBom,
      components: comps.rows,
      operations: ops.rows,
      product_name: prod.rows[0]?.name,
      product_version: prod.rows[0]?.version
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

const update = async (req, res) => {
  const { id } = req.params;
  const { notes, components, operations } = req.body;

  const client = await getClient();
  try {
    const existing = await query('SELECT * FROM boms WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'BoM not found' });
    if (existing.rows[0].status === 'archived') return res.status(400).json({ error: 'Cannot edit archived BoM' });

    await client.query('BEGIN');

    if (notes !== undefined) {
      await client.query('UPDATE boms SET notes = $1, updated_at = NOW() WHERE id = $2', [notes, id]);
    }

    if (components && Array.isArray(components)) {
      await client.query('DELETE FROM bom_components WHERE bom_id = $1', [id]);
      for (const comp of components) {
        if (!comp.component_name || !comp.quantity) continue;
        await client.query(
          `INSERT INTO bom_components (bom_id, component_name, quantity, unit) VALUES ($1, $2, $3, $4)`,
          [id, comp.component_name.trim(), parseFloat(comp.quantity), comp.unit || 'pcs']
        );
      }
    }

    if (operations && Array.isArray(operations)) {
      await client.query('DELETE FROM bom_operations WHERE bom_id = $1', [id]);
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        if (!op.name || !op.time_minutes) continue;
        await client.query(
          `INSERT INTO bom_operations (bom_id, name, time_minutes, work_center, sequence) VALUES ($1, $2, $3, $4, $5)`,
          [id, op.name.trim(), parseFloat(op.time_minutes), op.work_center || null, i + 1]
        );
      }
    }

    await client.query('COMMIT');
    await logAudit(ACTIONS.BOM_UPDATED, 'bom', id, existing.rows[0], { notes, components, operations }, req.user.id);

    const comps = await query('SELECT * FROM bom_components WHERE bom_id = $1 ORDER BY id', [id]);
    const ops = await query('SELECT * FROM bom_operations WHERE bom_id = $1 ORDER BY sequence', [id]);
    const bomData = await query('SELECT b.*, p.name as product_name FROM boms b JOIN products p ON b.product_id=p.id WHERE b.id=$1', [id]);

    return res.json({ ...bomData.rows[0], components: comps.rows, operations: ops.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

const archive = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await query('SELECT * FROM boms WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'BoM not found' });
    if (existing.rows[0].status === 'archived') return res.status(400).json({ error: 'BoM is already archived' });

    const result = await query(
      `UPDATE boms SET status = 'archived', updated_at = NOW() WHERE id = $1 RETURNING *`, [id]
    );
    await logAudit(ACTIONS.BOM_ARCHIVED, 'bom', id, { status: 'active' }, { status: 'archived' }, req.user.id);
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getById, create: createBomAndReturn, update, archive };
