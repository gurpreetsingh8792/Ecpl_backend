const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

router.post("/create", productController.addProduct);
router.get("/:productId", productController.getProductById);
router.get("/products/:projectId", productController.getProductsByProject);
router.post("/assign-vendor", productController.assignVendorToProduct);
module.exports = router;
