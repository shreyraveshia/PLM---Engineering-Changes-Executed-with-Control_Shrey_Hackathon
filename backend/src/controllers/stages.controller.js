const { query } = require('../config/db');
const { logAudit, ACTIONS } = require('../utils/auditLogger');

const getAll = async (req, res) => {
  try {
    const result = await query('SELECT * FROM eco_stages ORDER BY order_index ASC');
    return res.json(result.rows);
  } catch (err) { return res.status(500).json({ error: err.message }); }
};

const create = async (req, res) => {
  const { name, order_index, requires_approval, is_final, description } = req.body;
  if (!name || order_index === undefined) {
    return res.status(400).json({ error: 'name and order_index are required' });
  }
  try {
    const result = await query(
      `INSERT INTO eco_stages (name, order_index, requires_approval, is_final, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.trim(), parseInt(order_index), requires_approval || false, is_final || false, description || null]
    );
    await logAudit(ACTIONS.STAGE_CREATED, 'eco_stage', result.rows[0].id, null, result.rows[0], req.user.id);
    return res.status(201).json(result.rows[0]);
  } catch (err) { return res.status(500).json({ error: err.message }); }
};

const update = async (req, res) => {
  const { id } = req.params;
  const { name, order_index, requires_approval, is_final, description } = req.body;
  try {
    const existing = await query('SELECT * FROM eco_stages WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Stage not found' });

    const result = await query(
      `UPDATE eco_stages
       SET name = COALESCE($1, name),
           order_index = COALESCE($2, order_index),
           requires_approval = COALESCE($3, requires_approval),
           is_final = COALESCE($4, is_final),
           description = COALESCE($5, description)
       WHERE id = $6 RETURNING *`,
      [name || null, order_index ? parseInt(order_index) : null,
       requires_approval !== undefined ? requires_approval : null,
       is_final !== undefined ? is_final : null,
       description || null, id]
    );
    await logAudit(ACTIONS.STAGE_UPDATED, 'eco_stage', id, existing.rows[0], result.rows[0], req.user.id);
    return res.json(result.rows[0]);
  } catch (err) { return res.status(500).json({ error: err.message }); }
};

const remove = async (req, res) => {
  const { id } = req.params;
  try {
    const inUse = await query('SELECT id FROM ecos WHERE stage_id = $1 LIMIT 1', [id]);
    if (inUse.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete stage. It is currently used by one or more ECOs.' });
    }
    const existing = await query('SELECT * FROM eco_stages WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Stage not found' });

    await query('DELETE FROM eco_stages WHERE id = $1', [id]);
    await logAudit(ACTIONS.STAGE_DELETED, 'eco_stage', id, existing.rows[0], null, req.user.id);
    return res.json({ success: true, message: 'Stage deleted successfully' });
  } catch (err) { return res.status(500).json({ error: err.message }); }
};

module.exports = { getAll, create, update, remove };
