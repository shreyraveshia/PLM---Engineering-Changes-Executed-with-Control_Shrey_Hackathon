const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, archive } = require('../controllers/boms.controller');
const { verifyToken } = require('../middleware/auth');
const { isAdmin, isAdminOrEngineer } = require('../middleware/rbac');

router.get('/',              verifyToken, getAll);
router.get('/:id',           verifyToken, getById);
router.post('/',             verifyToken, isAdminOrEngineer, create);
router.put('/:id',           verifyToken, isAdminOrEngineer, update);
router.patch('/:id/archive', verifyToken, isAdmin, archive);

module.exports = router;
