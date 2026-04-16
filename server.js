const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();
const app = express();

// 1. STABLE CORS (Allows all Vercel and Local environments)
app.use(cors({
  origin: '*', 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 2. DATABASE CONFIGURATION
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 3. AUTO-TABLE CREATION (Ensures columns like 'password' and 'aadhaar_number' exist)
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        area VARCHAR(100),
        aadhaar_number VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Database tables are ready.");
  } catch (err) {
    console.error("❌ Database Init Error:", err.message);
  }
};
initDB();

// 4. THE "CLEAN START" TOOL (Use this if you get 'Incorrect Password' again)
// Visit: https://your-backend.onrender.com/api/admin/clear-all-users
app.get('/api/admin/clear-all-users', async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY');
    res.status(200).send("🔥 Database Wiped. All 'broken' user data has been deleted.");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 5. BUG-FREE REGISTRATION
app.post('/api/auth/register', async (req, res) => {
  const { name, phone, email, password, area, aadhaar_number } = req.body;
  
  try {
    // Force inputs to be clean strings to avoid [object Object] or null errors
    const safePhone = String(phone || "").trim();
    const safePass = String(password || "").trim();

    if (!safePhone || !safePass) {
      return res.status(400).json({ message: "Phone and password are required." });
    }

    // Check if user already exists
    const checkUser = await pool.query('SELECT id FROM users WHERE phone = $1', [safePhone]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: "Mobile number already registered." });
    }

    // Insert user - EXPLICIT mapping of values to columns
    const result = await pool.query(
      'INSERT INTO users (name, phone, email, password, area, aadhaar_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, phone',
      [name, safePhone, email, safePass, area, aadhaar_number]
    );

    res.status(201).json({
      message: "Registration Successful",
      user: result.rows // Correctly accessing the single user object
    });
  } catch (err) {
    console.error("Reg Error:", err.message);
    res.status(500).json({ message: "Error creating account." });
  }
});

// 6. BUG-FREE LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const inputPhone = String(phone || "").trim();
    const inputPass = String(password || "").trim();

    // Query database for the user
    const result = await pool.query('SELECT * FROM users WHERE phone = $1', [inputPhone]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Account not found." });
    }

    const user = result.rows; // Accessing the first user in the array

    // Double-check comparison by stripping all whitespace
    const dbPass = String(user.password || "").trim();
    const loginPass = inputPass.trim();

    console.log(`Login Debug: Phone [${inputPhone}] | DB Pass [${dbPass}] | Input Pass [${loginPass}]`);

    if (dbPass !== loginPass) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    res.status(200).json({
      message: "Login successful",
      user: { id: user.id, name: user.name, phone: user.phone },
      token: "aqua-secure-session-999"
    });

  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 7. START SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 AquaConnect Backend is live on port ${PORT}`);
});