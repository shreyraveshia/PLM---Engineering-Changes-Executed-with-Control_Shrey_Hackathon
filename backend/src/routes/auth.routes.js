const express = require('express');
const router = express.Router();
const { signup, login, me, getAllUsers } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/rbac');

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes
router.get('/me', verifyToken, me);
router.get('/users', verifyToken, isAdmin, getAllUsers);

module.exports = router;
