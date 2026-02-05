const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'campus-resource-secret-key-2024';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Basic Request Logger for Auth
app.use((req, res, next) => {
    if (req.url.startsWith('/api/auth')) {
        console.log(`[Auth Request] ${req.method} ${req.url}`);
    }
    next();
});

// Move static files to AFTER API routes or use a different path if possible
// But for now, let's just make sure API routes are defined.

// Initialize DB schema on start with retries
const initDb = async (retries = 5) => {
    while (retries > 0) {
        try {
            const schemaSql = fs.readFileSync('schema.sql', 'utf8');
            await pool.query(schemaSql);
            console.log('Database initialized');
            return;
        } catch (err) {
            retries -= 1;
            console.error(`Error initializing database (${5 - retries}/5):`, err.message);
            if (retries === 0) {
                console.error('Final attempt failed. Exiting...');
                process.exit(1);
            }
            console.log('Retrying in 5 seconds...');
            await new Promise(res => setTimeout(res, 5000));
        }
    }
};

initDb();

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log('[Auth] No token provided');
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log('[Auth] Token verification failed:', err.message);
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
};

// Middleware to verify Admin role
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Admin only.' });
    }
};

// API: Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// API: Register
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Check if user already exists
        const userCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, role',
            [username, password_hash]
        );

        const newUser = result.rows[0];

        const token = jwt.sign(
            { id: newUser.id, username: newUser.username, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: newUser
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// API: Get current user details
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, role, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
});

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
                AND b.status = 'APPROVED'
            ORDER BY r.id
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/bookings', authenticateToken, async (req, res) => {
    try {
        // Return all bookings so users can see occupancy.
        // Include is_mine flag to distinguish own bookings.
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
});

// API: Create a new booking
app.post('/api/bookings', authenticateToken, async (req, res) => {
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
            INSERT INTO bookings (resource_id, user_id, start_time, end_time, purpose, status)
            VALUES ($1, $2, $3, $4, $5, 'PENDING')
            RETURNING *
        `, [resource_id, req.user.id, start_time, end_time, purpose]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Booking creation failed' });
    }
});

// API: Request booking cancellation (User)
app.post('/api/bookings/:id/cancel', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        // Check if booking belongs to user
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
});

// API: Update booking status (Admin only)
app.patch('/api/bookings/:id/status', authenticateToken, isAdmin, async (req, res) => {
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

// API: Get utilization stats
app.get('/api/reports/utilization', authenticateToken, isAdmin, async (req, res) => {
    const { period } = req.query; // week, month, year

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
});

// API: Download utilization report as CSV
app.get('/api/reports/utilization/download', authenticateToken, isAdmin, async (req, res) => {
    const { period } = req.query;

    if (!['week', 'month', 'year'].includes(period)) {
        return res.status(400).json({ error: 'Invalid period' });
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

        // Generate CSV manually
        const fields = ['Resource Name', 'Type', 'Total Bookings', 'Total Hours Booked'];
        let csv = fields.join(',') + '\n';

        result.rows.forEach(row => {
            csv += `"${row.name}","${row.type}",${row.booking_count},${parseFloat(row.total_hours).toFixed(2)}\n`;
        });

        res.header('Content-Type', 'text/csv');
        res.attachment(`utilization_report_${period}.csv`);
        res.send(csv);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to download report' });
    }
});

// Serve static files AFTER API routes
app.use(express.static(path.join(__dirname, '../client')));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
