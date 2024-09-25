const express = require("express");
const driverController = require("../controllers/driverController");
const { upload } = require("../middleware/uploadMiddleware");

const router = express.Router();

// Route for adding a driver
router.post(
  "/add/:projectId",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "license", maxCount: 1 },
  ]),
  driverController.addDriver
);
router.get("/getdrivers/:projectId", driverController.getDriversByProject);
router.put(
  "/update/:driverId",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "licenseDocument", maxCount: 1 },
  ]),
  driverController.updateDriver
);
router.delete("/delete/:driverId/:projectId", driverController.deleteDriver);

module.exports = router;
