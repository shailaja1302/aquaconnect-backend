const pool = require("../config/db");

const createComplaintsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS complaints (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      type VARCHAR(50) NOT NULL,
      area VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      phone VARCHAR(15),
      status VARCHAR(50) DEFAULT 'Registered',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS water_supply (
      id SERIAL PRIMARY KEY,
      area VARCHAR(100) UNIQUE NOT NULL,
      status VARCHAR(50) DEFAULT 'Normal',
      time VARCHAR(50),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS water_quality (
      id SERIAL PRIMARY KEY,
      area VARCHAR(100) NOT NULL,
      ph DECIMAL(4,2),
      turbidity DECIMAL(5,2),
      chlorine DECIMAL(5,2),
      tds INTEGER,
      status VARCHAR(20) DEFAULT 'Safe',
      last_tested DATE,
      tested_by VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;
  await pool.query(query);
  console.log("All tables ready!");
};

module.exports = { createComplaintsTable };