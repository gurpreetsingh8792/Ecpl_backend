const express = require("express");
const router = express.Router();
const assignmentController = require("../controllers/assignmentController");

// Route to assign a vehicle to a driver
router.post("/assignvehicle", assignmentController.assignVehicleToDriver);

module.exports = router;
