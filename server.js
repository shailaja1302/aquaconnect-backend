const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

dotenv.config();
const app = express();

app.use(express.json());

// 1. CORS CONFIGURATION
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
    if (isAllowed) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// 2. DATABASE
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create tables
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

    console.log("✅ Database ready");
  } catch (err) {
    console.error("❌ DB Error:", err.message);
  }
};

pool.connect()
  .then(() => {
    console.log('✅ Connected to PostgreSQL');
    syncDatabase();
  })
  .catch(err => console.error("DB Connection Error:", err.message));

// 3. ROUTES
app.get('/', (req, res) => {
  res.send('AquaConnect API is running!');
});

// ================= REGISTER =================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, phone, email, password, area, aadhaar_number } = req.body;

    const cleanPhone = String(phone || "").trim();
    const cleanPass = String(password || "").trim();

    if (!cleanPhone || !cleanPass) {
      return res.status(400).json({ message: "Phone and password required." });
    }

    // Check existing user
    const existing = await pool.query(
      'SELECT * FROM users WHERE TRIM(phone) = $1',
      [cleanPhone]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Mobile number already registered." });
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(cleanPass, 10);

    const result = await pool.query(
      `INSERT INTO users (name, phone, email, password, area, aadhaar_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, phone`,
      [name, cleanPhone, email, hashedPassword, area, aadhaar_number]
    );

    res.status(201).json({
      message: "Registration successful",
      user: result.rows[0],
      token: "dummy-token-123"
    });

  } catch (err) {
    console.error("Registration Error:", err.message);
    res.status(500).json({ message: "Registration failed." });
  }
});

// ================= LOGIN =================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    const cleanPhone = String(phone || "").trim();
    const cleanInputPass = String(password || "").trim();

    console.log(`Login Attempt: [${cleanPhone}]`);

    const result = await pool.query(
      'SELECT * FROM users WHERE TRIM(phone) = $1',
      [cleanPhone]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Account not found." });
    }

    // ✅ FIXED HERE
    const user = result.rows[0];

    console.log(`DB Password Hash: ${user.password}`);

    // 🔐 Compare hashed password
    const isMatch = await bcrypt.compare(cleanInputPass, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password." });
    }

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

// ================= ALERTS =================
app.get('/api/alerts/active', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM emergency_alerts ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= START SERVER =================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});