const db = require("../config/db");

// Get water supply status
exports.getSupplyStatus = async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM water_supply ORDER BY area");
    res.json({ supply: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get supply status", error: err.message });
  }
};

// Get water quality reports
exports.getQualityReports = async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM water_quality ORDER BY last_tested DESC");
    res.json({ quality: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get quality reports", error: err.message });
  }
};

// Update supply status (admin only)
exports.updateSupplyStatus = async (req, res) => {
  try {
    const { area, status, time } = req.body;
    const result = await db.query(
      `INSERT INTO water_supply (area, status, time)
       VALUES ($1, $2, $3)
       ON CONFLICT (area)
       DO UPDATE SET status = $2, time = $3, updated_at = NOW()
       RETURNING *`,
      [area, status, time]
    );
    res.json({
      message: "Supply status updated",
      supply: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update supply status", error: err.message });
  }
};