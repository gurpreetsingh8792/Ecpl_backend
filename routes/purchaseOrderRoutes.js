const express = require("express");
const router = express.Router();
const purchaseOrderController = require("../controllers/purchaseOrderController");

// Route to generate a Purchase Order
router.post("/create", purchaseOrderController.generatePO);

module.exports = router;
