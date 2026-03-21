const express = require('express');
const router = express.Router();
const {
  getAll,
  getById,
  create,
  update,
  archive,
  getHistory
} = require('../controllers/products.controller');
const { verifyToken } = require('../middleware/auth');
const { allowRoles, isAdmin, isAdminOrEngineer } = require('../middleware/rbac');

router.get('/',             verifyToken, getAll);
router.get('/:id',          verifyToken, getById);
router.get('/:id/history',  verifyToken, getHistory);
router.post('/',            verifyToken, isAdminOrEngineer, create);
router.put('/:id',          verifyToken, isAdminOrEngineer, update);
router.patch('/:id/archive',verifyToken, isAdmin, archive);

module.exports = router;
