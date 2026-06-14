const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, bookingController.getBookings);
router.post('/', authenticateToken, bookingController.createBooking);
router.post('/:id/cancel', authenticateToken, bookingController.cancelBooking);
router.patch('/:id/status', authenticateToken, isAdmin, bookingController.updateBookingStatus);

module.exports = router;
