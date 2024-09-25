const Driver = require("../models/Driver");

exports.assignVehicleToDriver = async (req, res) => {
  console.log(req.body); // Log the request body

  const { vehicleId, driverId } = req.body;

  try {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // If vehicles is an array, push the vehicleId, otherwise set it directly
    if (Array.isArray(driver.vehicles)) {
      driver.vehicles.push(vehicleId);
    } else {
      driver.vehicles = vehicleId; // For single vehicle assignment
    }

    await driver.save();

    res
      .status(200)
      .json({ message: "Vehicle assigned to driver successfully" });
  } catch (error) {
    console.error("Error assigning vehicle to driver:", error);
    res
      .status(500)
      .json({ message: "Error assigning vehicle to driver", error });
  }
};
