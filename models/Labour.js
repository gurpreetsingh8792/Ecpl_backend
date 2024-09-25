const mongoose = require("mongoose");

const OvertimeSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  hours: {
    type: Number,
    required: true,
  },
  minutes: {
    type: Number,
    required: true,
  },
  notes: {
    type: String,
  },
  salary: {
    type: Number,
  },
});

const HalfDaySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  hours: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
  },
  salary: {
    type: Number,
  },
});

const AttendanceSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    enum: ["present", "absent", "none"],
    default: "none",
    required: true,
  },
});

const LabourSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  contractor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contractor",
  },
  designation: {
    type: String,
    required: true,
    enum: ["mason", "beldar", "koolie"],
  },
  salary: {
    type: String,
  },
  mobile: {
    type: String,
  },
  attendance: [AttendanceSchema],
  overtime: [OvertimeSchema],
  halfDay: [HalfDaySchema],
});

module.exports = mongoose.model("Labour", LabourSchema);
