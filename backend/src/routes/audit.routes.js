const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/reports.controller');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, getAuditLogs);

module.exports = router;
