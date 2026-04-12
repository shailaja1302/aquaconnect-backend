const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

const app = express();

// 1. CORS CONFIGURATION (Fixes your Vercel block)
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

// 2. DATABASE CONNECTION (Using the Render Connection String)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false 
  }
});

pool.connect((err) => {
  if (err) {
    console.error('❌ Database connection error:', err.stack);
  } else {
    console.log('✅ Connected to Render PostgreSQL');
  }
});

// 3. ROUTES
app.get('/', (req, res) => {
  res.send('AquaConnect API is live!');
});

// Registration Logic
app.post('/api/auth/register', async (req, res) => {
  const { name, phone, email, password, area, aadhaar_number } = req.body;

  try {
    // 1. Check duplicates
    const checkUser = await pool.query('SELECT * FROM users WHERE email = $1 OR phone = $2', [email, phone]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: "User with this email or phone already exists" });
    }

    // 2. Insert User
    const result = await pool.query(
      'INSERT INTO users (name, phone, email, password, area, aadhaar_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email',
      [name, phone, email, password, area, aadhaar_number]
    );

    res.status(201).json({
      message: "Success!",
      user: result.rows,
      token: "secure_token_placeholder" 
    });
  } catch (err) {
    console.error("DB Error:", err.message);
    res.status(500).json({ message: "Server Error: " + err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});