const express = require("express");
const vendorController = require("../controllers/vendorController");

const router = express.Router();

router.post("/create", vendorController.createVendor);
router.get("/vendors/:projectId", vendorController.getVendorsByProject);

module.exports = router;
