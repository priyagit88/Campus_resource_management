const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Initialize DB schema on start
const initDb = async () => {
    try {
        const schemaSql = fs.readFileSync('schema.sql', 'utf8');
        await pool.query(schemaSql);
        console.log('Database initialized');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};

initDb();

// API: Get all resources with dynamic occupancy status based on ACTUAL bookings
app.get('/api/resources', async (req, res) => {
    try {
        // We use a LEFT JOIN to check if there is an active booking RIGHT NOW
        // active booking = start_time <= NOW() AND end_time > NOW()
        const query = `
            SELECT 
                r.*,
                CASE 
                    WHEN b.id IS NOT NULL THEN true 
                    ELSE false 
                END as occupied,
                b.purpose as current_purpose,
                b.end_time as occupied_until
            FROM resources r
            LEFT JOIN bookings b ON r.id = b.resource_id 
                AND b.start_time <= NOW() 
                AND b.end_time > NOW()
            ORDER BY r.id
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API: Get all bookings
app.get('/api/bookings', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT b.*, r.name as resource_name, r.type as resource_type
            FROM bookings b
            JOIN resources r ON b.resource_id = r.id
            ORDER BY b.start_time DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API: Create a new booking
app.post('/api/bookings', async (req, res) => {
    const { resource_id, start_time, end_time, purpose } = req.body;

    // Basic validation
    if (!resource_id || !start_time || !end_time) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    try {
        // Check for conflicts
        // Conflict if: NewStart < ExistingEnd AND NewEnd > ExistingStart
        const conflictCheck = await pool.query(`
            SELECT id FROM bookings 
            WHERE resource_id = $1 
            AND start_time < $3 
            AND end_time > $2
        `, [resource_id, start_time, end_time]);

        if (conflictCheck.rows.length > 0) {
            return res.status(409).json({ error: 'Resource is already booked for this time slot' });
        }

        const result = await pool.query(`
            INSERT INTO bookings (resource_id, start_time, end_time, purpose)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [resource_id, start_time, end_time, purpose]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Booking creation failed' });
    }
});

// API: Seed/Reset Data
app.post('/api/seed', async (req, res) => {
    try {
        const schemaSql = fs.readFileSync('schema.sql', 'utf8');
        await pool.query(schemaSql);
        // Clear bookings
        await pool.query('TRUNCATE bookings RESTART IDENTITY');
        res.json({ message: 'Database seeded successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Seed failed' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
