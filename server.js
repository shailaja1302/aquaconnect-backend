const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// 1. Load Environment Variables
dotenv.config();

const app = express();

// 2. DYNAMIC CORS CONFIGURATION
// This allows your specific Vercel frontend to talk to this Render backend
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

// 3. DATABASE CONNECTION & AUTO-TABLE CREATION
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const createTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(20) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE,
      password VARCHAR(255) NOT NULL,
      area VARCHAR(100),
      aadhaar_number VARCHAR(20) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(queryText);
    console.log("✅ Users table is ready (verified)");
  } catch (err) {
    console.error("❌ Error creating table:", err);
  }
};

pool.connect((err) => {
  if (err) {
    console.error('❌ Database connection error:', err.stack);
  } else {
    console.log('✅ Connected to Render PostgreSQL');
    createTable(); 
  }
});

// 4. ROUTES
app.get('/', (req, res) => {
  res.send('AquaConnect Backend is Live and Connected!');
});

// Registration API
app.post('/api/auth/register', async (req, res) => {
  const { name, phone, email, password, area, aadhaar_number } = req.body;

  try {
    // Check if user exists
    const checkUser = await pool.query('SELECT * FROM users WHERE email = $1 OR phone = $2', [email, phone]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: "User with this email or phone already exists" });
    }

    // Insert new user
    // NOTE: For real security, you should hash 'password' with bcrypt before saving!
    const result = await pool.query(
      'INSERT INTO users (name, phone, email, password, area, aadhaar_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email',
      [name, phone, email, password, area, aadhaar_number]
    );

    res.status(201).json({
      message: "Registration Successful",
      user: result.rows,
      token: "dummy-jwt-token-for-testing" 
    });
  } catch (err) {
    console.error("Registration Logic Error:", err.message);
    res.status(500).json({ message: "Server Error: " + err.message });
  }
});

// 5. START SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});