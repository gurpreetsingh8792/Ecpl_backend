const MaterialConsumed = require("../models/MaterialConsumed");
const Product = require("../models/Product");
const MaterialReceipt = require("../models/MaterialReceipt");

exports.submitMaterialConsumed = async (req, res) => {
  const {
    materialId,
    description,
    quantityAvailable,
    quantityUsed,
    unitConsumed,
    manualUnit,
    usedBy,
    usageDate,
    reasonForUse,
    commentsConsumed,
    materialFormType,
  } = req.body;

  try {
    const unitToStore = unitConsumed === "Others" ? manualUnit : unitConsumed;
    const remainingQuantity = Math.max(quantityAvailable - quantityUsed, 0);
    const newMaterialConsumed = new MaterialConsumed({
      materialId,
      description,
      quantityAvailable,
      quantityUsed,
      remainingQuantity,
      unitConsumed: unitToStore,
      usedBy,
      usageDate,
      reasonForUse,
      commentsConsumed,
      materialFormType,
    });

    // Save the new entry
    await newMaterialConsumed.save();
    const product = await Product.findById(materialId);
    if (product) {
      product.availableQuantity = Math.max(
        product.availableQuantity - quantityUsed,
        0
      );
      await product.save();
    }
    await MaterialReceipt.updateMany(
      { materialName: materialId },
      { $inc: { quantityAvailable: -quantityUsed } }
    );

    res
      .status(201)
      .json({ message: "Material consumed entry submitted successfully!" });
  } catch (error) {
    console.error("Error submitting material consumed entry:", error);
    res
      .status(500)
      .json({ error: "An error occurred while submitting the form." });
  }
};
