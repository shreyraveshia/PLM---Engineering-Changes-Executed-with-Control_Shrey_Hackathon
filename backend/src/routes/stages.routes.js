const express = require('express');
const router = express.Router();
const { getAll, create, update, remove } = require('../controllers/stages.controller');
const { verifyToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/rbac');

router.get('/', verifyToken, getAll);
router.post('/', verifyToken, isAdmin, create);
router.put('/:id', verifyToken, isAdmin, update);
router.delete('/:id', verifyToken, isAdmin, remove);

module.exports = router;
