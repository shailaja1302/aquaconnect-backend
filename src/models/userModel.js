const pool = require("../config/db");

const createUsersTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(15) UNIQUE NOT NULL,
      email VARCHAR(100),
      password VARCHAR(255) NOT NULL,
      area VARCHAR(100),
      aadhaar VARCHAR(12),
      role VARCHAR(20) DEFAULT 'citizen',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;
  await pool.query(query);
  console.log("Users table ready!");
};

module.exports = { createUsersTable };