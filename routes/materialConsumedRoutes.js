const express = require("express");
const router = express.Router();
const materialConsumedController = require("../controllers/MaterialConsumedController");

router.post(
  "/material-consumed",
  materialConsumedController.submitMaterialConsumed
);

module.exports = router;
