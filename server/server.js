const app = require('./app');
const { initDb } = require('./services/dbService');
require('dotenv').config();

const port = process.env.PORT || 3000;

// Initialize Database
initDb().then(() => {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
