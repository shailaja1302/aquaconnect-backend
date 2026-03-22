const express = require("express");
const router = express.Router();
const waterController = require("../controllers/waterController");
const auth = require("../middleware/auth");

router.get("/supply", waterController.getSupplyStatus);
router.get("/quality", waterController.getQualityReports);
router.post("/supply", auth, waterController.updateSupplyStatus);

module.exports = router;