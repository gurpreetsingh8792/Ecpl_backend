const mongoose = require("mongoose");

const DriverSchema = new mongoose.Schema(
  {
    image: {
      type: String,
    },
    name: {
      type: String,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    address: {
      type: String,
    },
    licenseDocument: {
      type: String,
    },
    vehicles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Driver", DriverSchema);
