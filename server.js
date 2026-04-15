const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// 1. Load Environment Variables
dotenv.config();

const app = express();

// 2. DYNAMIC CORS CONFIGURATION
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://aquaconnect-frontend-jtz5flhj7-shailaja1302s-projects.vercel.app',
  /\.vercel\.app$/ 
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some((allowed) => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 3. DATABASE CONNECTION & SCHEMA SYNC
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const syncDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        area VARCHAR(100),
        aadhaar_number VARCHAR(20) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Database schema synchronized");
  } catch (err) {
    console.error("❌ Database sync error:", err.message);
  }
};

pool.connect((err) => {
  if (!err) {
    console.log('✅ Connected to Render PostgreSQL');
    syncDatabase(); 
  }
});

// 4. ROUTES

app.get('/', (req, res) => {
  res.send('AquaConnect API is running!');
});

// REGISTRATION - Perfected with Trimming
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, phone, email, password, area, aadhaar_number } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and Password are required." });
    }

    const cleanPhone = String(phone).trim();
    const cleanPass = String(password).trim(); // Save it clean!

    // Check if phone exists
    const phoneCheck = await pool.query('SELECT * FROM users WHERE TRIM(phone) = $1', [cleanPhone]);
    if (phoneCheck.rows.length > 0) {
      return res.status(400).json({ message: "Mobile number already registered." });
    }

    const result = await pool.query(
      'INSERT INTO users (name, phone, email, password, area, aadhaar_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, phone',
      [name, cleanPhone, email, cleanPass, area, aadhaar_number]
    );

    res.status(201).json({ message: "Registration Successful", user: result.rows });
  } catch (err) {
    console.error("Reg Error:", err.message);
    res.status(500).json({ message: "Registration failed." });
  }
});

// LOGIN - Perfected with Loose Matching
app.post('/api/auth/login', async (req, res) => {
  try {
    // 1. Get and Clean Input
    const phoneInput = String(req.body.phone || "").trim();
    const passInput = String(req.body.password || "").trim();

    if (!phoneInput || !passInput) {
      return res.status(400).json({ message: "Please provide both phone and password." });
    }

    // 2. Find User
    const result = await pool.query('SELECT * FROM users WHERE TRIM(phone) = $1', [phoneInput]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Account not found." });
    }

    const user = result.rows;

    // 3. LOOSE PASSWORD MATCH (Ignores all hidden white spaces)
    const dbPass = String(user.password || "").replace(/\s+/g, '');
    const cleanInputPass = passInput.replace(/\s+/g, '');

    if (dbPass !== cleanInputPass) {
      console.log(`Mismatch Detected! Input: [${cleanInputPass}], DB: [${dbPass}]`);
      return res.status(401).json({ message: "Incorrect password." });
    }

    // 4. Success
    res.status(200).json({
      message: "Login successful",
      user: { id: user.id, name: user.name, phone: user.phone },
      token: "dummy-token-123"
    });

  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).json({ message: "Internal Server Error." });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});