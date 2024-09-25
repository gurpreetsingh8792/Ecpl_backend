const Vendor = require("../models/Vendor");
const Project = require("../models/project");

exports.createVendor = async (req, res) => {
  try {
    const { name, mobile, address, projectId } = req.body;

    // Check if all required fields are present
    if (!name || !mobile || !address || !projectId) {
      return res.status(400).json({
        message:
          "Required fields (name, mobile, address, projectId) are missing",
      });
    }

    // Create the new vendor with projectId
    const newVendor = new Vendor({
      name,
      mobile,
      address,
      projectId, // Include projectId when creating the vendor
    });

    // Save the vendor to the database
    const savedVendor = await newVendor.save();

    // Find the project by its ID
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Add the vendor to the project's vendors array
    project.vendors.push(savedVendor._id);
    await project.save();

    // Respond with the newly created vendor
    res.status(201).json({
      message: "Vendor added successfully",
      vendor: savedVendor,
    });
  } catch (error) {
    console.error("Error creating vendor and adding to project: ", error);
    res.status(500).json({
      message: "An error occurred while creating the vendor",
    });
  }
};

exports.getVendorsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const vendors = await Vendor.find({ projectId });
    res.setHeader("Cache-Control", "no-store"); // Add this to prevent caching
    res.status(200).json(vendors);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({ message: "Error fetching vendors" });
  }
};
