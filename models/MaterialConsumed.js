const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MaterialConsumedSchema = new Schema({
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  quantityAvailable: {
    type: Number,
    required: true,
  },
  quantityUsed: {
    type: Number,
    required: true,
  },
  remainingQuantity: {
    type: Number,
    required: true,
  },
  unitConsumed: {
    type: String,
    required: true,
  },
  usedBy: {
    type: String,
    required: true,
  },
  usageDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  reasonForUse: {
    type: String,
    required: true,
  },
  commentsConsumed: {
    type: String,
    required: false,
  },
  materialFormType: {
    type: String,
    enum: ["directContainer", "splitDistribution"],
    required: true,
  },
});

module.exports = mongoose.model("MaterialConsumed", MaterialConsumedSchema);
