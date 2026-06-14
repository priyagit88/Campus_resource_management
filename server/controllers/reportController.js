const pool = require('../config/db');

const getUtilization = async (req, res) => {
    const { period } = req.query;

    if (!['week', 'month', 'year'].includes(period)) {
        return res.status(400).json({ error: 'Invalid period. Use week, month, or year.' });
    }

    try {
        const now = new Date();
        let startDate = new Date();

        if (period === 'week') {
            startDate.setDate(now.getDate() - 7);
        } else if (period === 'month') {
            startDate.setMonth(now.getMonth() - 1);
        } else if (period === 'year') {
            startDate.setFullYear(now.getFullYear() - 1);
        }

        const query = `
            SELECT 
                r.name, 
                r.type,
                COUNT(b.id) as booking_count,
                COALESCE(SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time))/3600), 0) as total_hours
            FROM resources r
            LEFT JOIN bookings b ON r.id = b.resource_id 
                AND b.status = 'APPROVED'
                AND b.start_time >= $1
            GROUP BY r.id, r.name, r.type
            ORDER BY total_hours DESC
        `;

        const result = await pool.query(query, [startDate]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

module.exports = { getUtilization };
