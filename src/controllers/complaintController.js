const db = require("../config/db");

exports.submitComplaint = async (req, res) => {
  try {
    const { type, area, description, phone } = req.body;
    const userId = req.user?.id || null;

    console.log("Complaint submission:", { type, area, userId });

    const result = await db.query(
      `INSERT INTO complaints (user_id, type, area, description, phone, status)
       VALUES ($1, $2, $3, $4, $5, 'Registered')
       RETURNING *`,
      [userId, type, area, description, phone]
    );

    console.log("Complaint saved:", result.rows[0]);

    res.status(201).json({
      message: "Complaint submitted successfully",
      complaint: result.rows[0]
    });
  } catch (err) {
    console.error("Submit complaint error:", err);
    res.status(500).json({ message: "Failed to submit complaint", error: err.message });
  }
};

exports.getAllComplaints = async (req, res) => {
  try {
    const { area, status, type } = req.query;
    let query = "SELECT * FROM complaints WHERE 1=1";
    const params = [];

    if (area) {
      params.push(area);
      query += ` AND area = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (type) {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }

    query += " ORDER BY created_at DESC";

    const result = await db.query(query, params);
    res.json({ complaints: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get complaints", error: err.message });
  }
};

exports.getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      "SELECT * FROM complaints WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Complaint not found" });
    }
    res.json({ complaint: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get complaint", error: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["Registered", "Assigned", "Field Visit", "Resolved"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const result = await db.query(
      `UPDATE complaints SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    res.json({
      message: "Status updated successfully",
      complaint: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update status", error: err.message });
  }
};

exports.getMyComplaints = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM complaints WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json({ complaints: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get complaints", error: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const total = await db.query("SELECT COUNT(*) FROM complaints");
    const resolved = await db.query("SELECT COUNT(*) FROM complaints WHERE status = 'Resolved'");
    const pending = await db.query("SELECT COUNT(*) FROM complaints WHERE status != 'Resolved'");
    const byType = await db.query(
      "SELECT type, COUNT(*) as count FROM complaints GROUP BY type"
    );
    const byArea = await db.query(
      "SELECT area, COUNT(*) as count FROM complaints GROUP BY area ORDER BY count DESC"
    );

    res.json({
      total: parseInt(total.rows[0].count),
      resolved: parseInt(resolved.rows[0].count),
      pending: parseInt(pending.rows[0].count),
      byType: byType.rows,
      byArea: byArea.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get stats", error: err.message });
  }
};