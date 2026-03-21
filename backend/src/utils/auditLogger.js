// This is a reusable utility — a helper function that every controller in your system 
// can call to write an audit log entry.


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

      // Why JSON.stringify? Because old_value and new_value columns are JSONB in the database.
      // They expect a JSON string. Your controllers will pass JavaScript objects, so JSON.stringify
      // converts them to the string format PostgreSQL expects.
    );
  } catch (err) {
    console.error('⚠️  Audit log failed (non-critical):', err.message);
  }
};

const ACTIONS = {
  PRODUCT_CREATED: 'product_created',
  PRODUCT_UPDATED: 'product_updated',
  PRODUCT_ARCHIVED: 'product_archived',
  PRODUCT_VERSIONED: 'product_new_version',
  BOM_CREATED: 'bom_created',
  BOM_UPDATED: 'bom_updated',
  BOM_ARCHIVED: 'bom_archived',
  BOM_VERSIONED: 'bom_new_version',
  ECO_CREATED: 'eco_created',
  ECO_UPDATED: 'eco_updated',
  ECO_DRAFT_SAVED: 'eco_draft_saved',
  ECO_STAGE_MOVED: 'eco_stage_moved',
  ECO_APPROVED: 'eco_approved',
  ECO_VALIDATED: 'eco_validated',
  ECO_APPLIED: 'eco_applied',
  ECO_CANCELLED: 'eco_cancelled',
  STAGE_CREATED: 'stage_created',
  STAGE_UPDATED: 'stage_updated',
  STAGE_DELETED: 'stage_deleted',
  USER_LOGIN: 'user_login',
  USER_REGISTERED: 'user_registered',
};

// This is a constants dictionary. 
// The dictionary is just a **convenience and consistency tool** — not a hard rule
// You can always add new action strings directly in your controllers if needed.
// This just keeps your code clean and prevents typos.

// Without this, every controller writes the action string manually:
// With ACTIONS: Every controller uses the exact same string. Consistent, searchable, guaranteed correct. ex:- logAudit(ACTIONS.ECO_APPROVED, ...)

// One line summary: The ACTIONS object is just a dictionary of constant strings so every 
// controller references the same variable instead of typing action strings manually — 
// eliminating typos and keeping audit log data consistent and searchable.

module.exports = { logAudit, ACTIONS };
