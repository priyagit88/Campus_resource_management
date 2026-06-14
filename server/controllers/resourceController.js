const pool = require('../config/db');

const getResources = async (req, res) => {
    try {
        const query = `
            SELECT 
                r.*,
                CASE 
                    WHEN b.id IS NOT NULL THEN true 
                    ELSE false 
                END as occupied,
                b.purpose as current_purpose,
                b.semester as current_semester,
                b.subject as current_subject,
                b.status as current_status,
                b.end_time as occupied_until
            FROM resources r
            LEFT JOIN bookings b ON r.id = b.resource_id 
                AND b.start_time <= NOW() 
                AND b.end_time > NOW()
                AND b.status IN ('APPROVED', 'BLOCKED', 'TIMETABLE')
            ORDER BY r.id
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getAvailability = async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    try {
        const query = `
            SELECT 
                r.id as resource_id,
                r.name as resource_name,
                r.type as resource_type,
                b.id as booking_id,
                b.start_time,
                b.end_time,
                b.semester,
                b.subject,
                b.status,
                u.username as booked_by
            FROM resources r
            LEFT JOIN bookings b ON r.id = b.resource_id 
                AND b.start_time::date = $1::date
                AND b.status IN ('APPROVED', 'BLOCKED', 'TIMETABLE')
            LEFT JOIN users u ON b.user_id = u.id
            ORDER BY r.name, b.start_time
        `;
        const result = await pool.query(query, [date]);
        
        const resources = {};
        result.rows.forEach(row => {
            if (!resources[row.resource_id]) {
                resources[row.resource_id] = {
                    id: row.resource_id,
                    name: row.resource_name,
                    type: row.resource_type,
                    bookings: []
                };
            }
            if (row.booking_id) {
                resources[row.resource_id].bookings.push({
                    id: row.booking_id,
                    start_time: row.start_time,
                    end_time: row.end_time,
                    semester: row.semester,
                    subject: row.subject,
                    status: row.status,
                    username: row.booked_by
                });
            }
        });

        res.json(Object.values(resources));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
};

module.exports = { getResources, getAvailability };
