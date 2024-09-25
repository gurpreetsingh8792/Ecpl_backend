const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projectController");

router.get("/projects/assigned/:userId", projectController.getAssignedProject);
router.get(
  "/projects/assigned-diesel/:userId",
  projectController.getAssignedProjectForDieselManager
);
router.get(
  "/projects/assigned-stock/:userId",
  projectController.getAssignedProjectForStockManager
);
router.get(
  "/assigned-diesel/:userId",
  projectController.getAssignedProjectDiesel
);
router.get(
  "/projects/assigned-stock/:userId",
  projectController.getAssignedProjectForStockManager
);
router.get(
  "/projects/assigned/labours/:userId",
  projectController.getAssignedProjectLabours
);

router.get(
  "/projects/assigned/peti/:userId",
  projectController.getAssignedProjectPetiThekedars
);
router.post("/projects", projectController.createProject);
router.put(
  "/projects/:projectId/assign",
  projectController.assignAttendeeToProject
);
router.get("/projects", projectController.listProjects);
router.put("/projects/:projectId", projectController.updateProjectName);
router.get("/projects/:projectId", projectController.getProjectById);
router.put(
  "/projects/:projectId/mark-as-done",
  projectController.markProjectAsDone
);
router.delete("/projects/:projectId", projectController.deleteProject);

module.exports = router;
