const mongoose = require("mongoose");

const PurchaseOrderSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  quantity: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    required: true,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  isBulk: {
    type: Boolean,
    default: false,
  },
  distributionType: {
    type: String,
    enum: ["direct container", "split distribution"],
  },
});

module.exports = mongoose.model("PurchaseOrder", PurchaseOrderSchema);
