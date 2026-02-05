const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(body || '{}'), headers: res.headers }));
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

function requestCsv(options) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body: body, headers: res.headers }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function verify() {
    try {
        console.log('1. Logging in...');
        const login = await request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { username: 'admin123', password: 'admin123' });

        const token = login.body.token;
        if (!token) throw new Error('Login failed');
        console.log('Login successful.');

        console.log('2. Getting resources...');
        const resources = await request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/resources',
            method: 'GET'
        });
        const resourceId = resources.body[0].id;
        console.log(`Using resource ID: ${resourceId}`);

        console.log('3. Creating a booking...');
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

        const booking = await request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/bookings',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }, {
            resource_id: resourceId,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            purpose: 'Verification Test'
        });

        const bookingId = booking.body.id;
        console.log(`Booking created with ID: ${bookingId}`);

        console.log('4. Approving booking...');
        await request({
            hostname: 'localhost',
            port: 3000,
            path: `/api/bookings/${bookingId}/status`,
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }, { status: 'APPROVED' });
        console.log('Booking approved.');

        console.log('5. Checking utilization report (Week)...');
        const report = await request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/reports/utilization?period=week',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Report Data:', JSON.stringify(report.body, null, 2));

        const resourceStat = report.body.find(r => r.id === resourceId);
        if (resourceStat && parseFloat(resourceStat.total_hours) >= 1.9) { // approx 2
            console.log('SUCCESS: Utilization calculation verified.');
        } else {
            console.log('FAILURE: Utilization calculation mismatch.');
        }

        console.log('6. Checking CSV download...');
        const csv = await requestCsv({
            hostname: 'localhost',
            port: 3000,
            path: '/api/reports/utilization/download?period=week',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (csv.headers['content-type'].includes('text/csv') && csv.body.includes('Total Hours Booked')) {
            console.log('SUCCESS: CSV download verified.');
        } else {
            console.log('FAILURE: CSV download failed. Headers:', csv.headers);
        }

    } catch (err) {
        console.error('Verification failed:', err);
    }
}

verify();
