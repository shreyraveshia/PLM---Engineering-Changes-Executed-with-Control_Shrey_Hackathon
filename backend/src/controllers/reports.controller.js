const { query } = require('../config/db');

const getEcoReport = async (req, res) => {
  try {
    const result = await query(`
      SELECT e.id, e.title, e.eco_type, e.status, e.effective_date, e.created_at,
             p.name AS product_name, p.version AS product_version,
             s.name AS stage_name, s.is_final,
             u.name AS created_by
      FROM ecos e
      JOIN products p ON e.product_id = p.id
      JOIN eco_stages s ON e.stage_id = s.id
      JOIN users u ON e.user_id = u.id
      ORDER BY e.created_at DESC
    `);
    return res.json(result.rows);
  } catch (err) { return res.status(500).json({ error: err.message }); }
};

const getProductHistory = async (req, res) => {
  try {
    const result = await query(`
      SELECT p.id, p.name, p.version, p.status, p.sale_price, p.cost_price,
             p.parent_id, p.created_at, u.name AS created_by
      FROM products p LEFT JOIN users u ON p.created_by = u.id
      ORDER BY p.name ASC, p.version ASC
    `);
    return res.json(result.rows);
  } catch (err) { return res.status(500).json({ error: err.message }); }
};

const getBomHistory = async (req, res) => {
  try {
    const result = await query(`
      SELECT b.id, b.version, b.status, b.parent_id, b.created_at,
             p.name AS product_name, p.version AS product_version, p.id AS product_id,
             u.name AS created_by,
             (SELECT count(*) FROM bom_components WHERE bom_id = b.id) AS component_count
      FROM boms b
      JOIN products p ON b.product_id = p.id
      LEFT JOIN users u ON b.created_by = u.id
      ORDER BY p.name ASC, b.version ASC
    `);
    return res.json(result.rows);
  } catch (err) { return res.status(500).json({ error: err.message }); }
};

const getArchivedProducts = async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, u.name AS created_by
      FROM products p LEFT JOIN users u ON p.created_by = u.id
      WHERE p.status = 'archived'
      ORDER BY p.updated_at DESC
    `);
    return res.json(result.rows);
  } catch (err) { return res.status(500).json({ error: err.message }); }
};

const getActiveMatrix = async (req, res) => {
  try {
    const result = await query(`
      SELECT p.id AS product_id, p.name AS product_name, p.version AS product_version,
             p.sale_price, p.cost_price,
             b.id AS bom_id, b.version AS bom_version,
             (SELECT count(*) FROM bom_components WHERE bom_id = b.id) AS component_count
      FROM products p
      LEFT JOIN boms b ON b.product_id = p.id AND b.status = 'active'
      WHERE p.status = 'active'
      ORDER BY p.name ASC
    `);
    return res.json(result.rows);
  } catch (err) { return res.status(500).json({ error: err.message }); }
};

const getAuditLogs = async (req, res) => {
  const { record_type, record_id, limit = 100 } = req.query;
  try {
    let sql = `
      SELECT a.id, a.action, a.record_type, a.record_id,
             a.old_value, a.new_value, a.created_at,
             u.name AS user_name, u.role AS user_role
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (record_type) { sql += ` AND a.record_type = $${idx}`; params.push(record_type); idx++; }
    if (record_id)   { sql += ` AND a.record_id = $${idx}`;   params.push(parseInt(record_id)); idx++; }

    sql += ` ORDER BY a.created_at DESC LIMIT $${idx}`;
    params.push(parseInt(limit));

    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err) { return res.status(500).json({ error: err.message }); }
};

module.exports = { getEcoReport, getProductHistory, getBomHistory, getArchivedProducts, getActiveMatrix, getAuditLogs };
