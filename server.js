const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const colors = require("colors");
const morgan = require("morgan");
const path = require("path");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projectRoutes");
const contractorRoutes = require("./routes/contractorRoutes");
const labourRoutes = require("./routes/labourRoutes");
const petiThekedarRoutes = require("./routes/petiThekedarRoutes");
const pdfRoutes = require("./routes/pdfRoutes");
const vehicleRoutes = require("./routes/vehicle");
const driverRoutes = require("./routes/driver");
const assignmentRoutes = require("./routes/assignmentRoutes");
const dieselRoutes = require("./routes/dieselRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const productRoutes = require("./routes/productRoutes");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");
const materialReceiptRoutes = require("./routes/materialReceiptRoutes");
const materialConsumedRoutes = require("./routes/materialConsumedRoutes");
const bulkMaterialRoutes = require("./routes/bulkMaterialRoutes");

//Dotenv
dotenv.config();

//connection from mongodb
connectDB();

//rest object
const app = express();

//middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", projectRoutes);
app.use("/api/contractors", contractorRoutes);
app.use("/api/labours", labourRoutes);
app.use("/api/petiThekedars", petiThekedarRoutes);
app.use("/api", pdfRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/assign", assignmentRoutes);
app.use("/api/diesel", dieselRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/product", productRoutes);
app.use("/api/po", purchaseOrderRoutes);
app.use("/api/materialreceipt", materialReceiptRoutes);
app.use("/api/materialconsumed", materialConsumedRoutes);
app.use("/api/bulk-recieved", bulkMaterialRoutes);

//port
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`.bgGreen.white);
});
