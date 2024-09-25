const Project = require("../models/project");
const PurchaseOrder = require("../models/PurchaseOrder");

exports.generatePO = async (req, res) => {
  console.log("Request Body:", req.body); // Log incoming data

  const {
    projectId,
    name, // Assuming the name comes from the frontend as 'name'
    code,
    description,
    quantity,
    unit,
    unitPrice,
    isBulk,
    distributionType,
    date,
  } = req.body;

  try {
    // Check if all required fields are filled
    if (!name || !code || !quantity || !unit || !unitPrice) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled" });
    }

    // Calculate the totalPrice manually
    const totalPrice = quantity * unitPrice;

    // Create a new PurchaseOrder
    const newPO = new PurchaseOrder({
      itemName: name, // Rename 'name' to 'itemName'
      code,
      description,
      quantity,
      unit,
      unitPrice,
      totalPrice, // Include totalPrice here
      isBulk,
      distributionType: isBulk ? null : distributionType,
      date,
    });

    const savedPO = await newPO.save();
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.purchaseOrders.push(savedPO._id);
    await project.save();

    res.status(201).json({
      message: "Purchase Order generated successfully",
      purchaseOrder: savedPO,
    });
  } catch (error) {
    console.error("Error generating PO:", error);
    res.status(500).json({
      message: "An error occurred while generating the Purchase Order",
    });
  }
};
