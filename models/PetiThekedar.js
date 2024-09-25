const mongoose = require("mongoose");

const DailyCountSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  masonCount: { type: Number, required: true, default: 0 },
  coolieCount: { type: Number, required: true, default: 0 },
  beldarCount: { type: Number, required: true, default: 0 },
});

const PetiThekedarSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  dailyCounts: [DailyCountSchema],
});

module.exports = mongoose.model("PetiThekedar", PetiThekedarSchema);
