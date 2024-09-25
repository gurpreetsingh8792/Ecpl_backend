const mongoose = require("mongoose");

const MaterialReceiptSchema = new mongoose.Schema({
  materialName: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  description: { type: String },
  quantityReceived: { type: Number },
  unit: { type: String, required: true },
  totalContainers: { type: Number },
  unitsPerContainer: { type: Number },
  totalUnits: { type: Number },
  quantityAvailable: { type: Number },
  receiptDate: { type: Date, required: true, default: Date.now },
  image: { type: String },
  imageTimestamp: { type: Date },
  slipImage: { type: String },
  slipImageTimestamp: { type: Date },
  poDocument: { type: String },
  poDocumentTimestamp: { type: Date },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  isBulk: { type: Boolean, default: false },
  materialFormType: {
    type: String,
    enum: ["directContainer", "splitDistribution"],
    required: true,
  },
  lastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MaterialReceipt", MaterialReceiptSchema);
