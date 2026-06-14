const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.post('/timetable', authenticateToken, isAdmin, adminController.addTimetable);
router.post('/block', authenticateToken, isAdmin, adminController.blockResource);
router.post('/timetable/sync', authenticateToken, isAdmin, adminController.syncTimetable);
router.post('/seed', adminController.seedData); // Seeding can be public for now given the context

module.exports = router;
