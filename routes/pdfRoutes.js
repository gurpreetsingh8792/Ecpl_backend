const express = require("express");
const PDFController = require("../controllers/pdfController");
const router = express.Router();

// Route to generate PDF
router.get("/generate-pdf/:projectId/:date", PDFController.generatePDF);
router.get("/generateRangePDF", PDFController.generateRangePDF);
router.get(
  "/generate-diesel-pdf/:projectId/:date",
  PDFController.generateDieselReportPDF
);
router.get(
  "/generateRangePDF-diesel",
  PDFController.generateDieselReportForRange
);
router.get(
  "/generate-Stock-pdf/:projectId/:date",
  PDFController.generateStockReportPDF
);
router.get("/generate-stock-pdf", PDFController.generateStockRangeReportPDF);
module.exports = router;
