const mongoose = require("mongoose");

const DieselStockSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    totalFuelAdded: {
      type: Number,
      default: 0,
    },
    openingBalance: {
      type: Number,
      required: true,
    },
    closingBalance: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DieselStock", DieselStockSchema);
