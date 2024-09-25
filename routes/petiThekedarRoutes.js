const express = require("express");
const router = express.Router();
const petiThekedarController = require("../controllers/petiThekedarController");

router.post("/addpeti/:projectId", petiThekedarController.addPetiThekedar);
router.put("/:id", petiThekedarController.editPetiThekedar);
router.delete("/:id/:projectId", petiThekedarController.deletePetiThekedar);
router.get("/:id", petiThekedarController.viewPetiThekedar);
router.put(
  "/:id/dailyCounts/:date",
  petiThekedarController.addOrUpdateDailyCounts
);
router.get(
  "/project/:projectId",
  petiThekedarController.getPetiThekedarsByProject
);

module.exports = router;
