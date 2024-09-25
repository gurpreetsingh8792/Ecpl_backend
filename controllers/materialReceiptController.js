const MaterialReceipt = require("../models/MaterialReceipt");
const Product = require("../models/Product");
const { uploadToS3 } = require("../middleware/uploadMaterial");

exports.materialReceivedStore = async (req, res) => {
  try {
    const {
      materialName, // This should be the productId
      description,
      quantityReceived,
      unit,
      totalContainers,
      unitsPerContainer,
      totalUnits,
      receiptDate,
      vendor,
      projectId,
      materialFormType,
    } = req.body;

    const image = req.files?.image
      ? await uploadToS3(req.files.image[0])
      : null;
    const slipImage = req.files?.slipImage
      ? await uploadToS3(req.files.slipImage[0])
      : null;
    const poDocument = req.files?.poDocument
      ? await uploadToS3(req.files.poDocument[0])
      : null;

    const imageTimestamp = image ? new Date() : null;
    const slipImageTimestamp = slipImage ? new Date() : null;
    const poDocumentTimestamp = poDocument ? new Date() : null;

    // Fetch the product details by ID (materialName is actually productId)
    const product = await Product.findById(materialName);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Calculate new available quantity based on whether it's a direct container or split distribution
    let newAvailableQuantity = 0;

    if (materialFormType === "directContainer") {
      newAvailableQuantity =
        product.availableQuantity + parseFloat(quantityReceived);
    } else if (materialFormType === "splitDistribution") {
      newAvailableQuantity = product.availableQuantity + parseFloat(totalUnits);
    }

    // Update product's available quantity
    product.availableQuantity = newAvailableQuantity;
    await product.save();

    // Create or update the material receipt entry
    const materialReceipt = new MaterialReceipt({
      materialName: product._id,
      description,
      quantityReceived,
      unit,
      totalContainers:
        materialFormType === "splitDistribution" ? totalContainers : undefined,
      unitsPerContainer:
        materialFormType === "splitDistribution"
          ? unitsPerContainer
          : undefined,
      totalUnits:
        materialFormType === "splitDistribution" ? totalUnits : undefined,
      receiptDate,
      quantityAvailable: newAvailableQuantity, // Store updated quantity
      vendor,
      projectId,
      image,
      imageTimestamp,
      slipImage,
      slipImageTimestamp,
      poDocument,
      poDocumentTimestamp,
      materialFormType,
    });

    await materialReceipt.save();

    res.status(201).json({
      message: "Material received and product quantity updated successfully!",
      newAvailableQuantity,
    });
  } catch (error) {
    console.error("Error storing material receipt:", error);
    res
      .status(500)
      .json({ error: "An error occurred while saving the material receipt." });
  }
};

exports.getAdminStoreMaterials = async (req, res) => {
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

    // Find materials where receiptDate is between the start and end of the selected date
    const storeMaterials = await MaterialReceipt.find({
      receiptDate: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    }).populate("materialName", "name"); // Populate materialName with its details

    if (!storeMaterials || storeMaterials.length === 0) {
      return res.status(404).json({ message: "No store materials found" });
    }

    // Fetch product names and other necessary fields for each material entry
    const storeMaterialsWithDetails = storeMaterials.map((material) => {
      return {
        _id: material._id,
        materialName: material.materialName.name, // Assuming Product schema has a 'name' field
        materialFormType: material.materialFormType,
        quantityReceived:
          material.materialFormType === "directContainer"
            ? material.quantityReceived
            : null,
        totalContainers:
          material.materialFormType === "splitDistribution"
            ? material.totalContainers
            : null,
        image: material.image,
        imageTimestamp: material.imageTimestamp,
        slipImage: material.slipImage,
        slipImageTimestamp: material.slipImageTimestamp,
        receiptDate: material.receiptDate,
      };
    });

    res.status(200).json(storeMaterialsWithDetails);
  } catch (error) {
    console.error("Error fetching store materials:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};
