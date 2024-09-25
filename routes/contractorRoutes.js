const express = require("express");
const router = express.Router();
const contractorController = require("../controllers/contractorController");

router.post("/addcontractors/:projectId", contractorController.addContractor);
router.get("/getcontractors", contractorController.getContractors);

module.exports = router;
