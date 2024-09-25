const mongoose = require("mongoose");

const BulkMaterialReceivedSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
    },
    length: {
      feet: {
        type: Number,
        required: true,
      },
      inches: {
        type: Number,
        required: true,
      },
    },
    width: {
      feet: {
        type: Number,
        required: true,
      },
      inches: {
        type: Number,
        required: true,
      },
    },
    height: {
      feet: {
        type: Number,
        required: true,
      },
      inches: {
        type: Number,
        required: true,
      },
    },
    totalVolume: {
      type: Number,
      required: true,
    },
    receivedDate: {
      type: Date,
      required: true,
    },
    vehiclePhoto: {
      uri: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        required: true,
      },
    },
    materialPhoto: {
      uri: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        required: true,
      },
    },

    emptyTruckPhoto: {
      uri: {
        type: String,
        required: false,
      },
      timestamp: {
        type: Date,
        required: false,
      },
    },
    remarks: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model(
  "BulkMaterialReceived",
  BulkMaterialReceivedSchema
);
