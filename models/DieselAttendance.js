const mongoose = require("mongoose");

const DieselAttendanceSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    totalReceived: {
      type: Number,
      required: true,
    },
    dieselConsumed: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DieselAttendance", DieselAttendanceSchema);
