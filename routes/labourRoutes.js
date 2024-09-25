const express = require("express");
const router = express.Router();
const labourController = require("../controllers/labourController");

router.post("/addlabour/:projectId", labourController.addLabour);
router.get("/labours/:projectId", labourController.getLabours);
router.put("/labour/edit/:labourId", labourController.editLabour);
router.delete(
  "/labour/delete/:labourId/:projectId",
  labourController.deleteLabour
);
router.get("/labour/view/:labourId", labourController.viewLabourDetails);
router.post("/labour/attendance/:labourId", labourController.markAttendance);
router.post("/overtime/:labourId", labourController.addOrUpdateOvertime);
router.get("/overtime/:labourId", labourController.getOvertime);
router.post("/halfday/:labourId", labourController.addOrUpdateHalfDay);
router.get("/halfday/:labourId", labourController.getHalfDay);

module.exports = router;
