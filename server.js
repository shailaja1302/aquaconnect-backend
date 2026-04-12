const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const db = require("./src/config/db"); // Ensure this file has the SSL settings

// Import Routes
const authRoutes = require("./src/routes/authRoutes");
const complaintRoutes = require("./src/routes/complaintRoutes");
const waterRoutes = require("./src/routes/waterRoutes");

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://aquaconnect-frontend-shailaja1302s-projects.vercel.app"
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/water", waterRoutes);

// Health check route
app.get("/", (req, res) => {
  res.json({
    message: "AquaConnect API is running!",
    version: "1.0.0",
    status: "OK"
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// Port Configuration for Render
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 AquaConnect server running on port ${PORT}`);
  
  // Test Database Connection on startup
  db.query('SELECT NOW()')
    .then(res => {
      console.log('✅ Database connected successfully at:', res.rows.now);
    })
    .catch(err => {
      console.error('❌ Database connection error details:', err.message);
    });
});

module.exports = app;