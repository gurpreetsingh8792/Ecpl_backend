const express = require("express");
const router = express.Router();
const materialReceiptController = require("../controllers/materialReceiptController");
const { uploadMaterial } = require("../middleware/uploadMaterial");

// Route for material received (non-bulk)
router.post(
  "/bulk-material-received",
  uploadMaterial.fields([
    { name: "image", maxCount: 1 },
    { name: "slipImage", maxCount: 1 },
    { name: "poDocument", maxCount: 1 },
  ]),
  materialReceiptController.materialReceivedStore
);
router.get(
  "/admin/store-materials",
  materialReceiptController.getAdminStoreMaterials
);

module.exports = router;
