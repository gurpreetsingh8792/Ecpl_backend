const express = require("express");
const router = express.Router();
const { uploadMaterial } = require("../middleware/uploadMaterial");
const bulkMaterialController = require("../controllers/bulkMaterialController");

// Define the route for submitting the bulk material received form
router.post(
  "/bulk-material-received",
  uploadMaterial.fields([
    { name: "vehiclePhoto", maxCount: 1 },
    { name: "materialPhoto", maxCount: 1 },
  ]),
  bulkMaterialController.submitBulkMaterialReceived
);
router.put(
  "/bulk-materials/:bulkMaterialId/update",
  uploadMaterial.fields([{ name: "emptyTruckPhoto", maxCount: 1 }]), // Handle the empty truck photo upload
  bulkMaterialController.updateBulkMaterialWithRemarksAndPhoto
);

router.get("/bulk-materials", bulkMaterialController.getBulkMaterials);
router.get(
  "/admin/bulk-materials",
  bulkMaterialController.getAdminBulkMaterials
);

module.exports = router;
