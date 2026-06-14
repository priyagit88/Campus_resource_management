const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/errorMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Request logging (simplified)
app.use((req, res, next) => {
    if (req.url.startsWith('/api/auth')) {
        console.log(`[Auth Request] ${req.method} ${req.url}`);
    }
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes); // Changed from direct usage in server.js
app.use('/api/reports', reportRoutes);

// Compatibility alias (for /api/availability which was at root level in original server.js)
app.get('/api/availability', require('./controllers/resourceController').getAvailability);
app.post('/api/seed', require('./controllers/adminController').seedData);

// Static files
app.use(express.static(path.join(__dirname, '../client/dist')));

// 404 handler
app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) {
        return res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    }
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use(errorHandler);

module.exports = app;
