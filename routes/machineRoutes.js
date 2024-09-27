const express = require("express");
const router = express.Router();
const {
  addMachineToProject,
  getMachinesByProject,
} = require("../controllers/machineController");

// Route to add a machine to a project
router.post("/add/:projectId", addMachineToProject);
router.get("/getmachines/:projectId", getMachinesByProject);

module.exports = router;
