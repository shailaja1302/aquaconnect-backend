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

// 3. DATABASE CONNECTION & COLUMN SYNCHRONIZATION
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const syncDatabase = async () => {
  try {
    // Ensure the base table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Forcefully add missing columns if they don't exist
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS area VARCHAR(100);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(20) UNIQUE;`);
    
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

// Root Route
app.get('/', (req, res) => {
  res.send('AquaConnect API is running and synchronized!');
});

// Registration API
app.post('/api/auth/register', async (req, res) => {
  let { name, phone, email, password, area, aadhaar_number } = req.body;

  try {
    // Basic validation to ensure phone is treated as a string
    const cleanPhone = phone ? phone.toString().trim() : '';
    const cleanEmail = email ? email.toString().trim().toLowerCase() : '';

    // Check if user already exists
    const checkUser = await pool.query('SELECT * FROM users WHERE phone = $1 OR email = $2', [cleanPhone, cleanEmail]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: "User with this phone or email already exists" });
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
    res.status(500).json({ message: "Database Error: " + err.message });
  }
});

// Login API - SAFE VERSION
app.post('/api/auth/login', async (req, res) => {
  let { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ message: "Phone and password are required" });
  }

  // Ensure inputs are clean strings
  const cleanPhone = phone.toString().trim();
  const rawPassword = password.toString();

  try {
    // 1. Find user by trimmed phone number
    const result = await pool.query('SELECT * FROM users WHERE TRIM(phone) = $1', [cleanPhone]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid phone number or password" });
    }

    const user = result.rows;

    // 2. Compare passwords (Note: Using .trim() on DB side just in case)
    if (user.password.toString().trim() !== rawPassword.trim()) {
      return res.status(401).json({ message: "Invalid phone number or password" });
    }

    // 3. Successful login
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
    console.error("Login Error:", err.message);
    res.status(500).json({ message: "Database Error: " + err.message });
  }
});

// 5. START SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});