const pool = require('../config/db');

const getBookings = async (req, res) => {
    try {
        let query = `
            SELECT b.*, r.name as resource_name, r.type as resource_type, u.username as requester,
                   CASE WHEN b.user_id = $1 THEN true ELSE false END as is_mine
            FROM bookings b
            JOIN resources r ON b.resource_id = r.id
            JOIN users u ON b.user_id = u.id
            ORDER BY b.start_time DESC
        `;

        const result = await pool.query(query, [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const createBooking = async (req, res) => {
    const { resource_id, start_time, end_time, purpose, semester, subject } = req.body;

    if (!resource_id || !start_time || !end_time) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    try {
        const start = new Date(start_time);
        const end = new Date(end_time);
        
        const startH = start.getHours() + start.getMinutes() / 60;
        const endH = end.getHours() + end.getMinutes() / 60;

        if (startH < 8.5 || endH > 17.5 || (startH >= endH)) {
            return res.status(400).json({ 
                error: 'Booking must be between 8:30 AM and 5:30 PM, and end time must be after start time.' 
            });
        }

        const conflictCheck = await pool.query(`
            SELECT id FROM bookings 
            WHERE resource_id = $1 
            AND status IN ('APPROVED', 'PENDING', 'BLOCKED', 'TIMETABLE')
            AND start_time < $3 
            AND end_time > $2
        `, [resource_id, start_time, end_time]);

        if (conflictCheck.rows.length > 0) {
            return res.status(409).json({ error: 'Resource is already booked for this time slot' });
        }

        const result = await pool.query(`
            INSERT INTO bookings (resource_id, user_id, start_time, end_time, purpose, semester, subject, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
            RETURNING *
        `, [resource_id, req.user.id, start_time, end_time, purpose, semester, subject]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Booking creation failed' });
    }
};

const cancelBooking = async (req, res) => {
    const { id } = req.params;
    try {
        const booking = await pool.query('SELECT user_id FROM bookings WHERE id = $1', [id]);

        if (booking.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to cancel this booking' });
        }

        const result = await pool.query(
            'UPDATE bookings SET status = \'CANCEL_REQUESTED\' WHERE id = $1 RETURNING *',
            [id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to request cancellation' });
    }
};

const updateBookingStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['APPROVED', 'REJECTED', 'CANCEL_APPROVED', 'CANCEL_REJECTED'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        if (status === 'CANCEL_APPROVED') {
            const result = await pool.query(
                'UPDATE bookings SET status = \'CANCELLED\' WHERE id = $1 RETURNING *',
                [id]
            );
            if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
            return res.json({ message: 'Booking cancelled successfully', cancelled: result.rows[0] });
        }

        const finalStatus = status === 'CANCEL_REJECTED' ? 'APPROVED' : status;

        const result = await pool.query(
            'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
            [finalStatus, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update booking status' });
    }
};

module.exports = { getBookings, createBooking, cancelBooking, updateBookingStatus };
