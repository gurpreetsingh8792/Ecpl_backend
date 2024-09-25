const PetiThekedar = require("../models/PetiThekedar");
const Project = require("../models/project");

exports.addPetiThekedar = async (req, res) => {
  const { projectId } = req.params;

  try {
    const petiThekedar = new PetiThekedar(req.body);
    await petiThekedar.save();

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.petiThekedars.push(petiThekedar._id);
    await project.save();

    res.status(201).json(petiThekedar);
  } catch (error) {
    res.status(500).json({ message: "Failed to add Peti Thekedar", error });
  }
};

// Edit a Peti Thekedar
exports.editPetiThekedar = async (req, res) => {
  const { id } = req.params;

  try {
    const updatedPetiThekedar = await PetiThekedar.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );
    if (!updatedPetiThekedar) {
      return res.status(404).json({ message: "Peti Thekedar not found" });
    }

    res.status(200).json(updatedPetiThekedar);
  } catch (error) {
    res.status(500).json({ message: "Failed to update Peti Thekedar", error });
  }
};

// Delete a Peti Thekedar
exports.deletePetiThekedar = async (req, res) => {
  const { id, projectId } = req.params;

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const petiThekedar = await PetiThekedar.findById(id);
    if (!petiThekedar) {
      return res.status(404).json({ message: "Peti Thekedar not found" });
    }

    await PetiThekedar.findByIdAndDelete(id);

    project.petiThekedars = project.petiThekedars.filter(
      (petiId) => petiId.toString() !== id
    );
    await project.save();

    res.status(200).json({ message: "Peti Thekedar deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete Peti Thekedar", error });
  }
};

// View a Peti Thekedar
exports.viewPetiThekedar = async (req, res) => {
  const { id } = req.params;

  try {
    const petiThekedar = await PetiThekedar.findById(id);
    if (!petiThekedar) {
      return res.status(404).json({ message: "Peti Thekedar not found" });
    }

    res.status(200).json(petiThekedar);
  } catch (error) {
    res.status(500).json({ message: "Failed to view Peti Thekedar", error });
  }
};

// Add or update daily counts
exports.addOrUpdateDailyCounts = async (req, res) => {
  const { id, date } = req.params;
  const { masonCount, coolieCount, beldarCount } = req.body;

  try {
    const petiThekedar = await PetiThekedar.findById(id);
    if (!petiThekedar) {
      return res.status(404).json({ message: "Peti Thekedar not found" });
    }

    const existingCount = petiThekedar.dailyCounts.find(
      (count) => new Date(count.date).toISOString().split("T")[0] === date
    );

    if (existingCount) {
      existingCount.masonCount = masonCount;
      existingCount.coolieCount = coolieCount;
      existingCount.beldarCount = beldarCount;
    } else {
      petiThekedar.dailyCounts.push({
        date,
        masonCount,
        coolieCount,
        beldarCount,
      });
    }

    await petiThekedar.save();
    res.status(200).json(petiThekedar);
  } catch (error) {
    res.status(500).json({ message: "Failed to update daily counts", error });
  }
};

// Get Peti Thekedars by Project ID
exports.getPetiThekedarsByProject = async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await Project.findById(projectId).populate("petiThekedars");
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json(project.petiThekedars);
  } catch (error) {
    res.status(500).json({ message: "Failed to get Peti Thekedars", error });
  }
};
