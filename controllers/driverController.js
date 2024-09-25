const fs = require("fs");
const path = require("path");
const Driver = require("../models/Driver");
const Project = require("../models/project");
const { uploadToS3 } = require("../middleware/uploadMiddleware");

exports.addDriver = async (req, res) => {
  const { projectId } = req.params;

  try {
    const { name, mobile, address } = req.body;

    const image = req.files?.image
      ? await uploadToS3(req.files.image[0])
      : null;
    const licenseDocument = req.files?.license
      ? await uploadToS3(req.files.license[0])
      : null;

    // Validate required fields: name and mobile
    if (!name || !mobile) {
      return res.status(400).json({
        message: "Name and mobile number are required fields.",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const newDriver = new Driver({
      image,
      name,
      mobile,
      address,
      licenseDocument,
      projects: [project._id],
    });

    const driver = await newDriver.save();

    project.drivers.push(driver._id);
    await project.save();

    res.status(201).json(driver);
  } catch (error) {
    console.error("Error adding driver:", error);
    res.status(500).json({ message: "Error adding driver", error });
  }
};

exports.getDriversByProject = async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await Project.findById(projectId).populate("drivers");
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json(project.drivers);
  } catch (error) {
    console.error("Error fetching drivers:", error);
    res.status(500).json({ message: "Error fetching drivers", error });
  }
};

exports.updateDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { name, mobile, address } = req.body;

    // Upload files to S3 if they are provided
    const image = req.files?.image
      ? await uploadToS3(req.files.image[0])
      : null;
    const licenseDocument = req.files?.licenseDocument
      ? await uploadToS3(req.files.licenseDocument[0])
      : null;

    const updatedFields = {
      name,
      mobile,
      address,
    };

    if (image) updatedFields.image = image;
    if (licenseDocument) updatedFields.licenseDocument = licenseDocument;

    const updatedDriver = await Driver.findByIdAndUpdate(
      driverId,
      updatedFields,
      {
        new: true,
      }
    );

    res.status(200).json(updatedDriver);
  } catch (error) {
    console.error("Error updating driver:", error);
    res.status(500).json({ message: "Error updating driver", error });
  }
};

exports.deleteDriver = async (req, res) => {
  try {
    const { driverId, projectId } = req.params;

    // Find the driver to get the image paths
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Delete the driver's images from the filesystem
    const deleteImage = (imagePath) => {
      if (imagePath) {
        const fullPath = path.join(__dirname, "..", imagePath);
        fs.unlink(fullPath, (err) => {
          if (err) {
            console.error(`Error deleting image ${imagePath}:`, err);
          }
        });
      }
    };

    deleteImage(driver.image);
    deleteImage(driver.licenseDocument);

    // Update the project to remove the driver reference
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      {
        $pull: { drivers: driverId },
      },
      { new: true }
    );

    if (!updatedProject) {
      return res
        .status(404)
        .json({ message: "Project not found or driver not in project" });
    }

    // Delete the driver from the database
    await Driver.findByIdAndDelete(driverId);

    res.status(200).json({ message: "Driver deleted successfully" });
  } catch (error) {
    console.error("Error deleting driver:", error);
    res.status(500).json({ message: "Error deleting driver", error });
  }
};
