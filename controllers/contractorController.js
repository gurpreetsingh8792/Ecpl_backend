const Contractor = require("../models/Contractor");
const Project = require("../models/project");

exports.addContractor = async (req, res) => {
  const { projectId } = req.params;

  try {
    const contractor = new Contractor(req.body);
    await contractor.save();

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.contractors.push(contractor._id);
    await project.save();

    res.status(201).json(contractor);
  } catch (error) {
    res.status(500).json({ message: "Failed to add contractor", error });
  }
};

exports.getContractors = async (req, res) => {
  try {
    const contractors = await Contractor.find();
    res.status(200).json(contractors);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch contractors", error });
  }
};
