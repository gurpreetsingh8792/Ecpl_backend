const express = require("express");
const router = express.Router();

const dieselController = require("../controllers/dieselController");
router.post("/add", dieselController.addDiesel);
router.get("/stock/:projectId", dieselController.getDieselStock);
router.get("/closing-balance/:projectId", dieselController.getClosingBalance);
router.get(
  "/admin/closing-balance/:projectId",
  dieselController.getClosingBalanceAdmin
);

router.put(
  "/admin/closing-balance/:projectId",
  dieselController.updateClosingBalanceAdmin
);
router.post("/attendance", dieselController.addDieselAttendance);

router.delete(
  "/attendance/:projectId/:vehicleId/:date",
  dieselController.deleteDieselAttendance
);

router.get(
  "/attendance/:projectId/:vehicleId/:date",
  dieselController.getDieselAttendance
);
router.get(
  "/fuel-consumed/:projectId/:date",
  dieselController.getFuelConsumedForDate
);
module.exports = router;
