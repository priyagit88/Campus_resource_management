const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

const initDb = async (retries = 5) => {
    while (retries > 0) {
        try {
            const schemaPath = path.join(__dirname, '../schema.sql');
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
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

module.exports = { initDb, pool };
