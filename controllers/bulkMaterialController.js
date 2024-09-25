const BulkMaterialReceived = require("../models/BulkMaterialReceived");
const Product = require("../models/Product");
const { uploadToS3 } = require("../middleware/uploadMaterial");

exports.submitBulkMaterialReceived = async (req, res) => {
  try {
    const {
      product,
      vehicleNumber,
      lengthFeet,
      lengthInches,
      widthFeet,
      widthInches,
      heightFeet,
      heightInches,
      totalVolume,
      receivedDate,
    } = req.body;

    let vehiclePhotoUrl = null;
    let materialPhotoUrl = null;

    if (req.files["vehiclePhoto"]) {
      const vehiclePhotoFile = req.files["vehiclePhoto"][0];
      vehiclePhotoUrl = await uploadToS3(vehiclePhotoFile);
    }
    if (req.files["materialPhoto"]) {
      const materialPhotoFile = req.files["materialPhoto"][0];
      materialPhotoUrl = await uploadToS3(materialPhotoFile);
    }

    // Create new bulk material entry
    const bulkMaterial = new BulkMaterialReceived({
      product,
      vehicleNumber,
      length: {
        feet: lengthFeet,
        inches: lengthInches,
      },
      width: {
        feet: widthFeet,
        inches: widthInches,
      },
      height: {
        feet: heightFeet,
        inches: heightInches,
      },
      totalVolume,
      receivedDate,
      vehiclePhoto: {
        uri: vehiclePhotoUrl,
        timestamp: Date.now(),
      },
      materialPhoto: {
        uri: materialPhotoUrl,
        timestamp: Date.now(),
      },
    });

    // Save the bulk material to the database
    await bulkMaterial.save();

    // Find the product by its ID and update the availableQuantity
    const updatedProduct = await Product.findByIdAndUpdate(
      product, // Product ID
      { $inc: { availableQuantity: totalVolume } }, // Increment availableQuantity by totalVolume
      { new: true } // Return the updated product
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.status(201).json({
      message:
        "Bulk material received and product quantity updated successfully!",
      bulkMaterial,
      updatedProduct,
    });
  } catch (error) {
    console.error("Error saving bulk material received:", error);
    res.status(500).json({ message: "Failed to save bulk material data." });
  }
};

exports.getBulkMaterials = async (req, res) => {
  try {
    // Get the current date in YYYY-MM-DD format to filter by receivedDate
    const today = new Date().toISOString().split("T")[0];

    // Find materials where receivedDate is today
    const bulkMaterials = await BulkMaterialReceived.find({
      receivedDate: {
        $gte: new Date(`${today}T00:00:00Z`), // Start of today in UTC
        $lt: new Date(`${today}T23:59:59Z`), // End of today in UTC
      },
    });

    if (!bulkMaterials || bulkMaterials.length === 0) {
      return res.status(404).json({ message: "No bulk materials found" });
    }

    // Fetch product names for each bulk material entry
    const bulkMaterialsWithProductNames = await Promise.all(
      bulkMaterials.map(async (material) => {
        const product = await Product.findById(material.product); // Fetch product by ID

        // Check if the emptyTruckPhoto is uploaded
        const isPhotoUploaded =
          material.emptyTruckPhoto && material.emptyTruckPhoto.uri;

        return {
          ...material._doc,
          productName: product ? product.name : "Unknown Product", // Add the product name
          isPhotoUploaded: !!isPhotoUploaded, // Add a flag for truck photo status
        };
      })
    );

    res.status(200).json(bulkMaterialsWithProductNames);
  } catch (error) {
    console.error("Error fetching bulk materials:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

exports.getAdminBulkMaterials = async (req, res) => {
  try {
    // Get the selected date from the query parameters
    const { date } = req.query;
    if (!date) {
      return res
        .status(400)
        .json({ message: "Date query parameter is required." });
    }

    // Set the start and end of the selected date in UTC
    const startOfDay = new Date(`${date}T00:00:00Z`);
    const endOfDay = new Date(`${date}T23:59:59Z`);

    // Find materials where receivedDate is between the start and end of the selected date
    const bulkMaterials = await BulkMaterialReceived.find({
      receivedDate: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    });

    if (!bulkMaterials || bulkMaterials.length === 0) {
      return res.status(404).json({ message: "No bulk materials found" });
    }

    // Fetch product names for each bulk material entry
    const bulkMaterialsWithProductNames = await Promise.all(
      bulkMaterials.map(async (material) => {
        const product = await Product.findById(material.product); // Fetch product by ID

        // Check if the emptyTruckPhoto is uploaded
        const isPhotoUploaded =
          material.emptyTruckPhoto && material.emptyTruckPhoto.uri;

        return {
          ...material._doc,
          productName: product ? product.name : "Unknown Product", // Add the product name
          isPhotoUploaded: !!isPhotoUploaded, // Add a flag for truck photo status
        };
      })
    );

    res.status(200).json(bulkMaterialsWithProductNames);
  } catch (error) {
    console.error("Error fetching bulk materials:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

exports.updateBulkMaterialWithRemarksAndPhoto = async (req, res) => {
  try {
    const { bulkMaterialId } = req.params; // Get the bulk material ID from params
    const { remarks } = req.body; // Get remarks from the request body
    const emptyTruckPhotoFile = req.files["emptyTruckPhoto"]
      ? req.files["emptyTruckPhoto"][0]
      : null;

    if (!emptyTruckPhotoFile) {
      return res.status(400).json({ message: "Empty truck photo is required" });
    }

    // Upload empty truck photo to S3 and get the URL
    const emptyTruckPhotoUrl = await uploadToS3(emptyTruckPhotoFile);

    // Update the bulk material record with the S3 URL and remarks
    const updatedMaterial = await BulkMaterialReceived.findByIdAndUpdate(
      bulkMaterialId,
      {
        emptyTruckPhoto: {
          uri: emptyTruckPhotoUrl, // Store the S3 URL instead of a local path
          timestamp: Date.now(), // Store the current timestamp
        },
        remarks,
      },
      { new: true } // Return the updated document
    );

    if (!updatedMaterial) {
      return res.status(404).json({ message: "Bulk material not found" });
    }

    res.status(200).json({
      message: "Bulk material updated successfully",
      updatedMaterial,
    });
  } catch (error) {
    console.error("Error updating bulk material:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};
