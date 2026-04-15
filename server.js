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
      console.log("CORS Blocked Origin:", origin);
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
    // Ensure the users table exists with all required columns
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

    // Ensure the alerts table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS emergency_alerts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(100),
        severity VARCHAR(20), 
        alert_type VARCHAR(50), 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("✅ Database schema synchronized successfully");
  } catch (err) {
    console.error("❌ Database sync error:", err.message);
  }
};

pool.connect((err) => {
  if (err) {
    console.error('❌ Database connection error:', err.stack);
  } else {
    console.log('✅ Connected to Render PostgreSQL');
    syncDatabase(); 
  }
});

// 4. ROUTES

app.get('/', (req, res) => {
  res.send('AquaConnect API is running!');
});

// Registration API
app.post('/api/auth/register', async (req, res) => {
  const { name, phone, email, password, area, aadhaar_number } = req.body;

  try {
    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and Password are required." });
    }

    const cleanPhone = phone.toString().trim();
    const cleanEmail = email ? email.toString().trim().toLowerCase() : null;

    // Check if phone already exists
    const phoneCheck = await pool.query('SELECT * FROM users WHERE phone = $1', [cleanPhone]);
    if (phoneCheck.rows.length > 0) {
      return res.status(400).json({ message: "This mobile number is already registered." });
    }

    // Insert new user
    const result = await pool.query(
      'INSERT INTO users (name, phone, email, password, area, aadhaar_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, phone, area',
      [name, cleanPhone, cleanEmail, password, area, aadhaar_number]
    );

    res.status(201).json({
      message: "Registration Successful",
      user: result.rows,
      token: "dummy-token-123" 
    });
  } catch (err) {
    console.error("Registration Error:", err.message);
    res.status(500).json({ message: "Database error during registration." });
  }
});

// Login API - THE FINAL FIX
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log("Received login request:", req.body);

    const { phone, password } = req.body;

    // 1. Basic validation
    if (!phone || !password) {
      return res.status(400).json({ message: "Please enter both phone and password." });
    }

    const cleanPhone = phone.toString().trim();
    const rawPassword = password.toString().trim();

    // 2. Query the user
    const result = await pool.query('SELECT * FROM users WHERE TRIM(phone) = $1', [cleanPhone]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Account not found." });
    }

    const user = result.rows;

    // 3. NULL-SAFE PASSWORD CHECK (This prevents the 'toString' crash)
    if (!user.password || user.password.toString().trim() !== rawPassword) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    // 4. Successful Login
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        area: user.area
      },
      token: "dummy-token-123"
    });

  } catch (err) {
    // This catches everything else and stops the server from crashing
    console.error("Critical Login Error:", err.message);
    res.status(500).json({ message: "Internal Server Error." });
  }
});

app.get('/api/alerts/active', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM emergency_alerts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});