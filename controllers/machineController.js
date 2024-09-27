const Machine = require("../models/Machine");
const Project = require("../models/project");

exports.addMachineToProject = async (req, res) => {
  try {
    const { name, number } = req.body;
    const { projectId } = req.params;

    // Check if the project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const newMachine = new Machine({
      name,
      number,
      project: projectId,
    });

    await newMachine.save();

    project.machines = project.machines || [];
    project.machines.push(newMachine._id);
    await project.save();

    res.status(201).json({
      message: "Machine added successfully",
      machine: newMachine,
    });
  } catch (error) {
    console.error("Error adding machine to project:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getMachinesByProject = async (req, res) => {
  const { projectId } = req.params;

  try {
    const machines = await Machine.find({ project: projectId });

    if (!machines || machines.length === 0) {
      return res
        .status(404)
        .json({ message: "No machines found for this project." });
    }

    res.status(200).json({ machines });
  } catch (error) {
    console.error("Error fetching machines:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
