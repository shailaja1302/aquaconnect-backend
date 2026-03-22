const express = require("express");
const router = express.Router();
const complaintController = require("../controllers/complaintController");
const auth = require("../middleware/auth");

router.post("/", auth, complaintController.submitComplaint);
router.get("/", complaintController.getAllComplaints);
router.get("/stats", complaintController.getStats);
router.get("/my", auth, complaintController.getMyComplaints);
router.get("/:id", complaintController.getComplaintById);
router.put("/:id/status", auth, complaintController.updateStatus);

module.exports = router;