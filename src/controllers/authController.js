const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

exports.register = async (req, res) => {
  try {
    const { name, phone, email, password, area, aadhaar } = req.body;

    console.log("Register attempt:", { name, phone, area });

    const existing = await db.query(
      "SELECT * FROM users WHERE phone = $1",
      [phone]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Phone number already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await db.query(
      `INSERT INTO users (name, phone, email, password, area, aadhaar)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, phone, email, area`,
      [name, phone, email || null, hashedPassword, area, aadhaar || null]
    );

    const user = result.rows[0];
    console.log("User registered:", user);

    const token = jwt.sign(
      { id: user.id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(201).json({
      message: "Registration successful",
      token,
      user
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    console.log("Login attempt:", phone);

    const result = await db.query(
      "SELECT * FROM users WHERE phone = $1",
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid phone or password" });
    }

    const user = result.rows[0];
    console.log("User found:", user.name);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid phone or password" });
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        area: user.area
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, name, phone, email, area FROM users WHERE id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get user", error: err.message });
  }
};

exports.sendOTP = async (req, res) => {
  try {
    const { aadhaar } = req.body;
    if (!aadhaar || aadhaar.length !== 12) {
      return res.status(400).json({ message: "Invalid Aadhaar number" });
    }
    res.json({
      message: "OTP sent successfully",
      otp: "1234"
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { aadhaar, otp } = req.body;
    if (otp === "1234") {
      res.json({ message: "OTP verified successfully", verified: true });
    } else {
      res.status(400).json({ message: "Invalid OTP", verified: false });
    }
  } catch (err) {
    res.status(500).json({ message: "OTP verification failed" });
  }
};