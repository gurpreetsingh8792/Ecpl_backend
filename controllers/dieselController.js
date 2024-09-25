const mongoose = require("mongoose");
const DieselStock = require("../models/DieselStock");
const DieselAttendance = require("../models/DieselAttendance");

exports.addDiesel = async (req, res) => {
  try {
    const { projectId, totalFuelAdded, date } = req.body;
    const totalFuelAddedNumber = Number(totalFuelAdded);

    let dieselStockForDate = await DieselStock.findOne({
      projectId,
      date: new Date(date),
    });

    const lastDieselStock = await DieselStock.findOne({
      projectId,
      date: { $lt: new Date(date) },
    }).sort({ date: -1 });

    let openingBalance = 0;
    if (lastDieselStock) {
      openingBalance = lastDieselStock.closingBalance;
    }

    const totalFuelReceivedByVehicles = await DieselAttendance.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(projectId),
          date: new Date(date),
        },
      },
      {
        $group: {
          _id: null,
          totalReceived: { $sum: "$totalReceived" },
        },
      },
    ]);

    const totalReceivedToday = totalFuelReceivedByVehicles.length
      ? totalFuelReceivedByVehicles[0].totalReceived
      : 0;

    if (dieselStockForDate) {
      dieselStockForDate.totalFuelAdded += totalFuelAddedNumber;
      dieselStockForDate.closingBalance =
        openingBalance + dieselStockForDate.totalFuelAdded - totalReceivedToday;

      await dieselStockForDate.save();

      return res.status(200).json({
        message: "Diesel stock updated successfully",
        dieselStock: dieselStockForDate,
      });
    } else {
      const newDieselStock = new DieselStock({
        projectId,
        totalFuelAdded: totalFuelAddedNumber,
        date: new Date(date),
        openingBalance,
        closingBalance:
          openingBalance + totalFuelAddedNumber - totalReceivedToday,
      });

      await newDieselStock.save();

      return res.status(201).json({
        message: "Diesel stock created successfully",
        dieselStock: newDieselStock,
      });
    }
  } catch (error) {
    console.error("Error adding or updating diesel stock:", error);
    return res
      .status(500)
      .json({ message: "Failed to add or update diesel stock" });
  }
};

exports.getDieselStock = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { date } = req.query;

    let dieselStock;

    if (date) {
      const parsedDate = new Date(date);
      dieselStock = await DieselStock.findOne({
        projectId,
        date: parsedDate,
      });
    } else {
      dieselStock = await DieselStock.findOne({ projectId }).sort({ date: -1 });
    }

    if (!dieselStock) {
      return res.status(404).json({ message: "No diesel stock found" });
    }

    const lastFuelAddedEntry = await DieselStock.findOne({
      projectId,
      totalFuelAdded: { $gt: 0 },
    }).sort({ date: -1 });

    const lastFuelAdded = lastFuelAddedEntry
      ? lastFuelAddedEntry.totalFuelAdded
      : 0;
    const lastFuelAddedDate = lastFuelAddedEntry
      ? lastFuelAddedEntry.date
      : null;

    res.status(200).json({
      dieselStock,
      lastFuelAdded,
      lastFuelAddedDate,
    });
  } catch (error) {
    console.error("Error fetching diesel stock:", error);
    res.status(500).json({ message: "Failed to fetch diesel stock" });
  }
};

exports.addDieselAttendance = async (req, res) => {
  try {
    const { projectId, vehicleId, totalReceived, dieselConsumed, date } =
      req.body;

    const totalReceivedNumber = isNaN(Number(totalReceived))
      ? 0
      : Number(totalReceived);
    const dieselConsumedNumber = isNaN(Number(dieselConsumed))
      ? 0
      : Number(dieselConsumed);

    // Check if an attendance record already exists for the same vehicle and date
    let existingAttendance = await DieselAttendance.findOne({
      projectId,
      vehicleId,
      date: new Date(date),
    });

    if (existingAttendance) {
      // If it exists, update the record by adding the new values to the existing ones
      existingAttendance.totalReceived += totalReceivedNumber;
      existingAttendance.dieselConsumed += dieselConsumedNumber;
      await existingAttendance.save();

      // Update the current stock based on the new values
      let currentStock = await DieselStock.findOne({
        projectId,
        date: new Date(date),
      });

      if (currentStock) {
        currentStock.closingBalance -= totalReceivedNumber;
        await currentStock.save();
      }

      return res.status(200).json({
        message: "Diesel attendance updated successfully",
        attendance: existingAttendance,
        stock: currentStock,
      });
    }

    // If no attendance record exists, create a new one
    const newAttendance = new DieselAttendance({
      projectId,
      vehicleId,
      totalReceived: totalReceivedNumber,
      dieselConsumed: dieselConsumedNumber,
      date,
    });

    await newAttendance.save();

    // Manage diesel stock
    let currentStock = await DieselStock.findOne({
      projectId,
      date: new Date(date),
    });

    if (!currentStock) {
      const lastDieselStock = await DieselStock.findOne({
        projectId,
        date: { $lt: new Date(date) },
      }).sort({ date: -1 });

      let openingBalance = 0;
      if (lastDieselStock) {
        openingBalance = lastDieselStock.closingBalance;
      }

      currentStock = new DieselStock({
        projectId,
        totalFuelAdded: 0,
        openingBalance,
        closingBalance: openingBalance - totalReceivedNumber,
        date,
      });

      await currentStock.save();
    } else {
      currentStock.closingBalance -= totalReceivedNumber;
      await currentStock.save();
    }

    res.status(201).json({
      message: "Diesel attendance added successfully",
      attendance: newAttendance,
      stock: currentStock,
    });
  } catch (error) {
    console.error("Error adding diesel attendance:", error);
    res.status(500).json({ message: "Failed to add diesel attendance" });
  }
};
exports.deleteDieselAttendance = async (req, res) => {
  try {
    const { projectId, vehicleId, date } = req.params;

    // Find the attendance record for the specified vehicle on the selected date
    const attendance = await DieselAttendance.findOne({
      projectId,
      vehicleId,
      date: new Date(date),
    });

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found." });
    }
    const totalReceived = attendance.totalReceived;
    const dieselConsumed = attendance.dieselConsumed;
    await DieselAttendance.deleteOne({ _id: attendance._id });
    let currentStock = await DieselStock.findOne({
      projectId,
      date: new Date(date),
    });

    if (currentStock) {
      currentStock.closingBalance += totalReceived;
      await currentStock.save();
    } else {
      return res.status(500).json({ message: "Stock record not found." });
    }

    res.status(200).json({
      message: "Attendance record and stock updated successfully.",
      stock: currentStock,
    });
  } catch (error) {
    console.error("Error removing diesel attendance:", error);
    res.status(500).json({ message: "Failed to remove diesel attendance." });
  }
};

exports.getDieselAttendance = async (req, res) => {
  try {
    const { projectId, vehicleId, date } = req.params;

    let attendance = await DieselAttendance.findOne({
      projectId,
      vehicleId,
      date: new Date(date),
    });

    if (!attendance) {
      return res.status(200).json({
        projectId,
        vehicleId,
        date: new Date(date),
        totalReceived: 0,
        dieselConsumed: 0,
      });
    }

    res.status(200).json(attendance);
  } catch (error) {
    console.error("Error fetching diesel attendance:", error);
    res.status(500).json({ message: "Failed to fetch diesel attendance" });
  }
};

exports.getFuelConsumedForDate = async (req, res) => {
  try {
    const { projectId, date } = req.params;

    const inputDate = new Date(date);
    const startOfDay = new Date(inputDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(inputDate.setHours(23, 59, 59, 999));

    const totalConsumed = await DieselAttendance.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(projectId),
          date: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: null,
          totalConsumed: { $sum: "$totalReceived" },
        },
      },
    ]);

    const totalFuelConsumed =
      totalConsumed.length > 0 ? totalConsumed[0].totalConsumed : 0;

    res.status(200).json({ totalFuelConsumed, date });
  } catch (error) {
    console.error("Error fetching fuel consumed:", error);
    res.status(500).json({ message: "Failed to fetch fuel consumed" });
  }
};

exports.getClosingBalance = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { date } = req.query;

    const currentDate = new Date(
      date || new Date().toISOString().split("T")[0]
    );

    let dieselStock = await DieselStock.findOne({
      projectId,
      date: currentDate,
    });

    if (!dieselStock) {
      dieselStock = await DieselStock.findOne({
        projectId,
        date: { $lt: currentDate },
      }).sort({ date: -1 });
    }

    if (!dieselStock) {
      return res.status(404).json({
        message:
          "No closing balance data available for this date or any previous date.",
      });
    }

    res.status(200).json({
      closingBalance: dieselStock.closingBalance,
      date: dieselStock.date,
    });
  } catch (error) {
    console.error("Error fetching closing balance:", error);
    res.status(500).json({ message: "Failed to fetch closing balance" });
  }
};

exports.getClosingBalanceAdmin = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { date } = req.query;

    // Check if the date query parameter is passed
    if (!date) {
      return res
        .status(400)
        .json({ message: "Date query parameter is required." });
    }

    const currentDate = new Date(date);
    const startOfDay = new Date(currentDate.setUTCHours(0, 0, 0, 0));
    const endOfDay = new Date(currentDate.setUTCHours(23, 59, 59, 999));

    let dieselStock = await DieselStock.findOne({
      projectId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (!dieselStock) {
      dieselStock = await DieselStock.findOne({
        projectId,
        date: { $lt: startOfDay },
      }).sort({ date: -1 });

      if (!dieselStock) {
        return res.status(404).json({
          message:
            "No closing balance data available for the selected date or any previous date.",
        });
      }
    }

    // Return the found diesel stock
    res.status(200).json({
      closingBalance: dieselStock.closingBalance,
      date: dieselStock.date,
    });
  } catch (error) {
    console.error("Error fetching closing balance:", error);
    res.status(500).json({ message: "Failed to fetch closing balance" });
  }
};

// Controller to update the closing balance for a specific project and date
exports.updateClosingBalanceAdmin = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { date } = req.query;
    const { closingBalance } = req.body;

    // Validate that closingBalance is provided
    if (closingBalance === undefined || closingBalance === null) {
      return res
        .status(400)
        .json({ message: "Closing balance is required in the request body." });
    }

    // Check if the date query parameter is passed
    if (!date) {
      return res
        .status(400)
        .json({ message: "Date query parameter is required." });
    }

    const currentDate = new Date(date);
    const startOfDay = new Date(currentDate.setUTCHours(0, 0, 0, 0));
    const endOfDay = new Date(currentDate.setUTCHours(23, 59, 59, 999));

    // Find the diesel stock record for the specified projectId and date
    let dieselStock = await DieselStock.findOne({
      projectId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (!dieselStock) {
      // If no record is found for the exact date, return an error
      return res
        .status(404)
        .json({
          message: "No diesel stock record found for the specified date.",
        });
    }

    // Update the closing balance
    dieselStock.closingBalance = closingBalance;

    // Save the updated record
    await dieselStock.save();

    // Return the updated record
    res.status(200).json({
      message: "Closing balance updated successfully",
      dieselStock,
    });
  } catch (error) {
    console.error("Error updating closing balance:", error);
    res.status(500).json({ message: "Failed to update closing balance" });
  }
};
