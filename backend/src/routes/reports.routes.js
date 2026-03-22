const express = require('express');
const router = express.Router();
const {
  getEcoReport, getProductHistory, getBomHistory,
  getArchivedProducts, getActiveMatrix
} = require('../controllers/reports.controller');
const { verifyToken } = require('../middleware/auth');
const { allowRoles } = require('../middleware/rbac');

const reportAccess = allowRoles('admin', 'engineering_user', 'approver');

router.get('/ecos',             verifyToken, reportAccess, getEcoReport);
router.get('/product-history',  verifyToken, reportAccess, getProductHistory);
router.get('/bom-history',      verifyToken, reportAccess, getBomHistory);
router.get('/archived-products',verifyToken, reportAccess, getArchivedProducts);
router.get('/active-matrix',    verifyToken, reportAccess, getActiveMatrix);

module.exports = router;
