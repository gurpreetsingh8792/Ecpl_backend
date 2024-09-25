const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    attendee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: false,
      required: false,
      sparse: true,
    },
    dieselManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: false,
      required: false,
      sparse: true,
    },
    stockManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: false,
      required: false,
      sparse: true,
    },
    vehicles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
      },
    ],
    drivers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
      },
    ],

    contractors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contractor",
      },
    ],
    labours: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Labour",
      },
    ],
    petiThekedars: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PetiThekedar",
      },
    ],
    vendors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
      },
    ],
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    purchaseOrders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PurchaseOrder",
      },
    ],
    done: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", ProjectSchema);
