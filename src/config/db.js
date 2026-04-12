const { Pool } = require('pg');
require('dotenv').config();

// Initialize the connection pool using the environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // This allows connecting to Render's hosted database without certificate errors
    rejectUnauthorized: false
  }
});

// Log if the pool encounters an unexpected error
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool // Exporting the pool itself in case you need it for specific logic
};