const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  materialType: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  availableQuantity: {
    type: Number,
    default: 0,
  },
  unit: {
    type: String,
    required: true,
  },
  lastUpdate: {
    type: Date,
    default: Date.now,
  },
  isBulk: {
    type: Boolean,
    default: false, // If false, it's in-store. If true, it's bulk.
  },
  distributionType: {
    type: String,
    enum: ["direct container", "split distribution"],
  },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
});

module.exports = mongoose.model("Product", ProductSchema);
