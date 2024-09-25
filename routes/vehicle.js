const express = require("express");
const { upload } = require("../middleware/uploadMiddleware");
const router = express.Router();
const vehicleController = require("../controllers/vehicleController");

router.post(
  "/add/:projectId",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "rcDocument", maxCount: 1 },
    { name: "insuranceDocument", maxCount: 1 },
    { name: "pollutionCheckDocument", maxCount: 1 },
  ]),
  vehicleController.addVehicle
);
router.get("/getvehicles/:projectId", vehicleController.getVehiclesByProject);
router.get(
  "/getassignedvehicles/:projectId",
  vehicleController.getAssignedVehicles
);
router.put(
  "/update/:vehicleId",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "rcDocument", maxCount: 1 },
    { name: "insuranceDocument", maxCount: 1 },
    { name: "pollutionCheckDocument", maxCount: 1 },
  ]),
  vehicleController.updateVehicle
);
router.delete("/delete/:vehicleId/:projectId", vehicleController.deleteVehicle);

module.exports = router;
