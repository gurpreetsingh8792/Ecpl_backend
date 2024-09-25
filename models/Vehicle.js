const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema(
  {
    image: {
      type: String,
    },
    name: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
    },
    number: {
      type: String,
      required: true,
    },
    type: {
      type: String,
    },
    rcDocument: {
      type: String,
    },
    insuranceDocument: {
      type: String,
    },
    pollutionCheckDocument: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", VehicleSchema);
