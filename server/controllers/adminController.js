const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

const addTimetable = async (req, res) => {
    const { resource_id, day_of_week, start_time, end_time, semester, subject } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO timetable (resource_id, day_of_week, start_time, end_time, semester, subject) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [resource_id, day_of_week, start_time, end_time, semester, subject]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to insert timetable entry' });
    }
};

const blockResource = async (req, res) => {
    const { resource_id, start_time, end_time, purpose } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO bookings (resource_id, user_id, start_time, end_time, purpose, status)
             VALUES ($1, $2, $3, $4, $5, 'BLOCKED') RETURNING *`,
            [resource_id, req.user.id, start_time, end_time, purpose || 'Maintenance/Blocked']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to block resource' });
    }
};

const syncTimetable = async (req, res) => {
    const { startDate, endDate } = req.body;
    try {
        const timetable = await pool.query('SELECT * FROM timetable');
        const start = new Date(startDate);
        const end = new Date(endDate);
        let count = 0;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            const entries = timetable.rows.filter(e => e.day_of_week === dayOfWeek);

            for (const entry of entries) {
                const bStart = new Date(d);
                const [sH, sM] = entry.start_time.split(':');
                bStart.setHours(sH, sM, 0);

                const bEnd = new Date(d);
                const [eH, eM] = entry.end_time.split(':');
                bEnd.setHours(eH, eM, 0);

                const conflict = await pool.query(
                    "SELECT id FROM bookings WHERE resource_id = $1 AND start_time < $3 AND end_time > $2 AND status != 'CANCELLED'",
                    [entry.resource_id, bStart, bEnd]
                );

                if (conflict.rows.length === 0) {
                    await pool.query(
                        `INSERT INTO bookings (resource_id, user_id, start_time, end_time, purpose, semester, subject, status)
                         VALUES ($1, $2, $3, $4, 'Timetable Class', $5, $6, 'TIMETABLE')`,
                        [entry.resource_id, req.user.id, bStart, bEnd, entry.semester, entry.subject]
                    );
                    count++;
                }
            }
        }
        res.json({ message: `Successfully generated ${count} bookings from timetable.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to sync timetable' });
    }
};

const seedData = async (req, res) => {
    try {
        const schemaPath = path.join(__dirname, '../schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schemaSql);
        await pool.query('TRUNCATE bookings RESTART IDENTITY');
        res.json({ message: 'Database seeded successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Seed failed' });
    }
};

module.exports = { addTimetable, blockResource, syncTimetable, seedData };
