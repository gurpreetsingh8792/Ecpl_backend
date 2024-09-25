const Project = require("../models/project");
const Product = require("../models/Product");

exports.addProduct = async (req, res) => {
  const {
    projectId,
    name,
    code,
    materialType,
    description,
    availableQuantity,
    unit,
    isBulk,
    distributionType,
  } = req.body;

  try {
    // Check if required fields are missing
    if (!name || !code || !materialType || !unit || !projectId) {
      return res.status(400).json({
        message:
          "Required fields (name, code, materialType, unit, projectId, distributionType) are missing",
      });
    }

    // Parse quantities to ensure they are numbers
    const availableQty = parseFloat(availableQuantity) || 0; // Default to 0 if not provided

    // Check for existing product with the same name and code within the same distribution type
    const existingProduct = await Product.findOne({
      projectId,
      name,
      code,
      distributionType, // Ensure uniqueness within the same distribution type
    });

    if (existingProduct) {
      return res.status(400).json({
        message: `A product with the name "${name}" and code "${code}" already exists in the ${distributionType}. Please choose another name or code.`,
      });
    }

    // Create new product instance with projectId
    const newProduct = new Product({
      name,
      code,
      materialType,
      description,
      availableQuantity: availableQty,
      unit,
      isBulk,
      distributionType,
      projectId,
    });

    const savedProduct = await newProduct.save();

    // Find and update the project with the new product
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.products.push(savedProduct._id);
    await project.save();

    res.status(201).json({
      message: "Product added successfully",
      product: savedProduct,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    res
      .status(500)
      .json({ message: "An error occurred while adding the product" });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({
      name: product.name,
      availableQuantity: product.availableQuantity,
      isBulk: product.isBulk,
      distributionType: product.distributionType,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getProductsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const products = await Product.find({ projectId });
    res.setHeader("Cache-Control", "no-store"); // Add this to prevent caching
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Error fetching products" });
  }
};

exports.assignVendorToProduct = async (req, res) => {
  try {
    const { productId, vendorId } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.vendor = vendorId;
    await product.save();

    res
      .status(200)
      .json({ message: "Vendor assigned to product successfully", product });
  } catch (error) {
    console.error("Error assigning vendor to product:", error);
    res.status(500).json({ message: "Error assigning vendor to product" });
  }
};
