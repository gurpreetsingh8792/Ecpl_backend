const Labour = require("../models/Labour");
const Project = require("../models/project");

exports.addLabour = async (req, res) => {
  const { projectId } = req.params;

  try {
    const labourData = { ...req.body };

    if (labourData.contractor === "local") {
      labourData.contractor = null;
      labourData.isLocal = true;
    } else {
      labourData.isLocal = false;
    }

    const labour = new Labour(labourData);
    await labour.save();

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.labours.push(labour._id);
    await project.save();

    res.status(201).json(labour);
  } catch (error) {
    console.error("Failed to add labour:", error);
    res.status(500).json({ message: "Failed to add labour", error });
  }
};

exports.getLabours = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId).populate("labours");
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json(project.labours);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch labours", error });
  }
};

exports.editLabour = async (req, res) => {
  try {
    const { labourId } = req.params;
    const updatedData = req.body;

    const labour = await Labour.findByIdAndUpdate(labourId, updatedData, {
      new: true,
    });
    if (!labour) {
      return res.status(404).json({ message: "Labour not found" });
    }

    res.status(200).json(labour);
  } catch (error) {
    res.status(500).json({ message: "Failed to update labour", error });
  }
};

exports.deleteLabour = async (req, res) => {
  try {
    const { labourId, projectId } = req.params;

    await Labour.findByIdAndDelete(labourId);

    const project = await Project.findById(projectId);
    if (project) {
      project.labours = project.labours.filter(
        (id) => id.toString() !== labourId
      );
      await project.save();
    }

    res.status(200).json({ message: "Labour deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete labour", error });
  }
};

exports.viewLabourDetails = async (req, res) => {
  try {
    const { labourId } = req.params;

    const labour = await Labour.findById(labourId).populate("contractor");
    if (!labour) {
      return res.status(404).json({ message: "Labour not found" });
    }

    res.status(200).json(labour);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch labour details", error });
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { labourId } = req.params;
    const { status, date } = req.body;

    const labour = await Labour.findById(labourId);
    if (!labour) {
      return res.status(404).json({ message: "Labour not found" });
    }

    let attendanceRecord = labour.attendance.find(
      (record) => record.date.toISOString().split("T")[0] === date
    );

    if (attendanceRecord) {
      attendanceRecord.type = status;
    } else {
      labour.attendance.push({ date: new Date(date), type: status });
    }

    await labour.save();
    res.status(200).json(labour);
  } catch (error) {
    res.status(500).json({ message: "Failed to update attendance", error });
  }
};

exports.addOrUpdateOvertime = async (req, res) => {
  try {
    const { labourId } = req.params;
    const { hours, minutes, notes, salary } = req.body;

    const labour = await Labour.findById(labourId);

    if (!labour) {
      return res.status(404).send("Labour not found");
    }

    // Check if there's already an overtime entry for today
    const today = new Date().toISOString().split("T")[0];
    let overtime = labour.overtime.find(
      (ot) => ot.date.toISOString().split("T")[0] === today
    );

    if (overtime) {
      // Update existing overtime entry
      overtime.hours = hours;
      overtime.minutes = minutes;
      overtime.notes = notes;
      overtime.salary = salary;
    } else {
      // Add a new overtime entry
      overtime = {
        date: new Date(),
        hours,
        minutes,
        notes,
        salary,
      };
      labour.overtime.push(overtime);
    }

    await labour.save();

    res.status(200).send("Overtime recorded/updated successfully");
  } catch (error) {
    console.error("Error recording/updating overtime:", error);
    res.status(500).send("Server Error");
  }
};

exports.getOvertime = async (req, res) => {
  try {
    const { labourId } = req.params;

    const labour = await Labour.findById(labourId);

    if (!labour) {
      return res.status(404).send("Labour not found");
    }

    res.status(200).json(labour.overtime);
  } catch (error) {
    console.error("Error fetching overtime:", error);
    res.status(500).send("Server Error");
  }
};

exports.addOrUpdateHalfDay = async (req, res) => {
  try {
    const { labourId } = req.params;
    const { hours, reason, salary } = req.body;

    const labour = await Labour.findById(labourId);

    if (!labour) {
      return res.status(404).send("Labour not found");
    }

    const today = new Date().toISOString().split("T")[0];
    let halfDay = labour.halfDay.find(
      (hd) => hd.date.toISOString().split("T")[0] === today
    );

    if (halfDay) {
      halfDay.hours = hours;
      halfDay.reason = reason;
      halfDay.salary = salary;
    } else {
      halfDay = {
        date: new Date(),
        hours,
        reason,
        salary,
      };
      labour.halfDay.push(halfDay);
    }

    await labour.save();

    res.status(200).send("Half-day recorded/updated successfully");
  } catch (error) {
    console.error("Error recording/updating half-day:", error);
    res.status(500).send("Server Error");
  }
};

exports.getHalfDay = async (req, res) => {
  try {
    const { labourId } = req.params;

    const labour = await Labour.findById(labourId);

    if (!labour) {
      return res.status(404).send("Labour not found");
    }

    res.status(200).json(labour.halfDay);
  } catch (error) {
    console.error("Error fetching half-day:", error);
    res.status(500).send("Server Error");
  }
};
