const mongoose = require("mongoose");

const VendorSchema = new mongoose.Schema({
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
    required: true,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
});

module.exports = mongoose.model("Vendor", VendorSchema);
