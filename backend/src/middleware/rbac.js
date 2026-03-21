const VALID_ROLES = ['admin', 'engineering_user', 'approver', 'operations_user'];


// (...) =>The three dots ... is called the rest operator. It means:
//"collect all arguments I receive into one array"
const allowRoles = (...allowedRoles) => {
  const invalidRoles = allowedRoles.filter(r => !VALID_ROLES.includes(r));
  if (invalidRoles.length > 0) {
    throw new Error(`Invalid roles specified in allowRoles: ${invalidRoles.join(', ')}`);
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized. You must be logged in.'
      });
    }

    if (!req.user.role) {
      return res.status(403).json({
        error: 'Forbidden. User has no role assigned.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden. This action requires one of these roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
};

const isAdmin = allowRoles('admin');
const isAdminOrEngineer = allowRoles('admin', 'engineering_user');
const isAdminOrApprover = allowRoles('admin', 'approver');
const isAnyAuthenticated = allowRoles('admin', 'engineering_user', 'approver', 'operations_user');

module.exports = { allowRoles, isAdmin, isAdminOrEngineer, isAdminOrApprover, isAnyAuthenticated };
