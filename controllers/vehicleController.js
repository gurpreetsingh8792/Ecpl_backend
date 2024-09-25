const fs = require("fs");
const path = require("path");
const Vehicle = require("../models/Vehicle");
const Project = require("../models/project");
const Driver = require("../models/Driver");
const { uploadToS3 } = require("../middleware/uploadMiddleware");

exports.addVehicle = async (req, res) => {
  const { projectId } = req.params;

  try {
    const { name, brand, number, type } = req.body;

    const image = req.files?.image
      ? await uploadToS3(req.files.image[0])
      : null;

    const rcDocument = req.files?.rcDocument
      ? await uploadToS3(req.files.rcDocument[0])
      : null;
    const insuranceDocument = req.files?.insuranceDocument
      ? await uploadToS3(req.files.insuranceDocument[0])
      : null;
    const pollutionCheckDocument = req.files?.pollutionCheckDocument
      ? await uploadToS3(req.files.pollutionCheckDocument[0])
      : null;

    // Validate required fields: vehicle name and vehicle number
    if (!name || !number) {
      return res.status(400).json({
        message: "Vehicle name and vehicle number are required fields.",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const newVehicle = new Vehicle({
      image,
      name,
      brand,
      number,
      type,
      rcDocument,
      insuranceDocument,
      pollutionCheckDocument,
      projects: [project._id],
    });

    const vehicle = await newVehicle.save();

    project.vehicles.push(vehicle._id);
    await project.save();

    res.status(201).json(vehicle);
  } catch (error) {
    console.error("Error adding vehicle:", error);
    res.status(500).json({ message: "Error adding vehicle", error });
  }
};

exports.getVehiclesByProject = async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await Project.findById(projectId).populate("vehicles");
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json(project.vehicles);
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    res.status(500).json({ message: "Error fetching vehicles", error });
  }
};

exports.getAssignedVehicles = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Find the project by ID and populate vehicles and drivers separately
    const project = await Project.findById(projectId)
      .populate("vehicles")
      .populate("drivers");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Extract vehicles and their corresponding drivers
    const assignedVehicles = project.vehicles.map((vehicle) => {
      const assignedDriver = project.drivers.find((driver) =>
        driver.vehicles.includes(vehicle._id)
      );

      const imageUrl = vehicle.image ? `${vehicle.image}` : null;
      const rcDocumentUrl = vehicle.rcDocument ? `${vehicle.rcDocument}` : null;
      const insuranceDocumentUrl = vehicle.insuranceDocument
        ? `${vehicle.insuranceDocument}`
        : null;
      const pollutionCheckDocumentUrl = vehicle.pollutionCheckDocument
        ? `${vehicle.pollutionCheckDocument}`
        : null;

      return {
        vehicleId: vehicle._id,
        vehicleName: vehicle.name || "Unnamed Vehicle",
        vehicleNumber: vehicle.number || "Unknown Number",
        vehicleBrand: vehicle.brand || "Unknown Brand",
        vehicleType: vehicle.type || "Unknown Type",
        rcDocument: rcDocumentUrl,
        insuranceDocument: insuranceDocumentUrl,
        pollutionCheckDocument: pollutionCheckDocumentUrl,
        driverName: assignedDriver ? assignedDriver.name : " ",
        driverId: assignedDriver ? assignedDriver._id : null,
        driverMobile: assignedDriver ? assignedDriver.mobile : null,
        driverAddress: assignedDriver ? assignedDriver.address : null,
        licenseDocument: assignedDriver
          ? `${assignedDriver.licenseDocument}`
          : null,
        image: imageUrl, // Include the full URL of the image
      };
    });

    return res.status(200).json({ assignedVehicles });
  } catch (error) {
    console.error("Error fetching assigned vehicles:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { name, brand, number, type } = req.body;

    const image = req.files?.image
      ? await uploadToS3(req.files.image[0])
      : null;

    const rcDocument = req.files?.rcDocument
      ? await uploadToS3(req.files.rcDocument[0])
      : null;
    const insuranceDocument = req.files?.insuranceDocument
      ? await uploadToS3(req.files.insuranceDocument[0])
      : null;
    const pollutionCheckDocument = req.files?.pollutionCheckDocument
      ? await uploadToS3(req.files.pollutionCheckDocument[0])
      : null;

    const updatedFields = {
      name,
      brand,
      number,
      type,
    };

    if (image) updatedFields.image = image;
    if (rcDocument) updatedFields.rcDocument = rcDocument;
    if (insuranceDocument) updatedFields.insuranceDocument = insuranceDocument;
    if (pollutionCheckDocument)
      updatedFields.pollutionCheckDocument = pollutionCheckDocument;

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      vehicleId,
      updatedFields,
      {
        new: true,
      }
    );

    res.status(200).json(updatedVehicle);
  } catch (error) {
    console.error("Error updating vehicle:", error);
    res.status(500).json({ message: "Error updating vehicle", error });
  }
};

exports.deleteVehicle = async (req, res) => {
  try {
    const { vehicleId, projectId } = req.params;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

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

    deleteImage(vehicle.image);
    deleteImage(vehicle.rcDocument);
    deleteImage(vehicle.insuranceDocument);
    deleteImage(vehicle.pollutionCheckDocument);

    await Project.findByIdAndUpdate(projectId, {
      $pull: { vehicles: vehicleId },
    });

    await Vehicle.findByIdAndDelete(vehicleId);

    res.status(200).json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    res.status(500).json({ message: "Error deleting vehicle", error });
  }
};
