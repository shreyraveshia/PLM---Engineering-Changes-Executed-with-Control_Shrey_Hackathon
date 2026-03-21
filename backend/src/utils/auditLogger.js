const { query } = require('../config/db');

const logAudit = async (action, recordType, recordId, oldValue, newValue, userId) => {
  try {
    await query(
      `INSERT INTO audit_logs (action, record_type, record_id, old_value, new_value, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        action,
        recordType || null,
        recordId || null,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        userId || null
      ]
    );
  } catch (err) {
    console.error('⚠️  Audit log failed (non-critical):', err.message);
  }
};

const ACTIONS = {
  PRODUCT_CREATED:     'product_created',
  PRODUCT_UPDATED:     'product_updated',
  PRODUCT_ARCHIVED:    'product_archived',
  PRODUCT_VERSIONED:   'product_new_version',
  BOM_CREATED:         'bom_created',
  BOM_UPDATED:         'bom_updated',
  BOM_ARCHIVED:        'bom_archived',
  BOM_VERSIONED:       'bom_new_version',
  ECO_CREATED:         'eco_created',
  ECO_UPDATED:         'eco_updated',
  ECO_DRAFT_SAVED:     'eco_draft_saved',
  ECO_STAGE_MOVED:     'eco_stage_moved',
  ECO_APPROVED:        'eco_approved',
  ECO_VALIDATED:       'eco_validated',
  ECO_APPLIED:         'eco_applied',
  ECO_CANCELLED:       'eco_cancelled',
  STAGE_CREATED:       'stage_created',
  STAGE_UPDATED:       'stage_updated',
  STAGE_DELETED:       'stage_deleted',
  USER_LOGIN:          'user_login',
  USER_REGISTERED:     'user_registered',
};

module.exports = { logAudit, ACTIONS };
