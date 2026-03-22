const express = require('express');
const router = express.Router();
const {
  getAll, getById, create, saveDraftBom, saveDraftProduct,
  getDiff, approve, validate, cancel
} = require('../controllers/ecos.controller');
const { verifyToken } = require('../middleware/auth');
const { allowRoles, isAdmin, isAdminOrEngineer, isAdminOrApprover } = require('../middleware/rbac');

router.get('/',                    verifyToken, getAll);
router.get('/:id',                 verifyToken, getById);
router.get('/:id/diff',            verifyToken, getDiff);
router.post('/',                   verifyToken, isAdminOrEngineer, create);
router.put('/:id/draft-bom',       verifyToken, isAdminOrEngineer, saveDraftBom);
router.put('/:id/draft-product',   verifyToken, isAdminOrEngineer, saveDraftProduct);
router.post('/:id/approve',        verifyToken, isAdminOrApprover, approve);
router.post('/:id/validate',       verifyToken, isAdminOrEngineer, validate);
router.post('/:id/cancel',         verifyToken, isAdminOrEngineer, cancel);

module.exports = router;
