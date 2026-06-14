const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/utilization', authenticateToken, isAdmin, reportController.getUtilization);

module.exports = router;
