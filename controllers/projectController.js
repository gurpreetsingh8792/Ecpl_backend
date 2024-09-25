const Project = require("../models/project");

exports.createProject = async (req, res) => {
  const { name, attendeeId, dieselManagerId, stockManagerId } = req.body;

  if (!name || !attendeeId || !dieselManagerId || !stockManagerId) {
    return res.status(400).json({
      message:
        "Project name, attendee, diesel manager, and stock manager are all required.",
    });
  }

  try {
    const existingProject = await Project.findOne({ name });
    if (existingProject) {
      return res.status(400).json({
        message: "Project name already exists. Please choose a different name.",
      });
    }
    const existingAttendeeAssignment = await Project.findOne({
      attendee: attendeeId,
    });
    if (existingAttendeeAssignment) {
      return res.status(400).json({
        message: "Attendee is already assigned to another project.",
      });
    }
    const existingDieselManagerAssignment = await Project.findOne({
      dieselManager: dieselManagerId,
    });
    if (existingDieselManagerAssignment) {
      return res.status(400).json({
        message: "Diesel Manager is already assigned to another project.",
      });
    }
    const existingStockManagerAssignment = await Project.findOne({
      stockManager: stockManagerId,
    });
    if (existingStockManagerAssignment) {
      return res.status(400).json({
        message: "Stock Manager is already assigned to another project.",
      });
    }
    const project = new Project({
      name,
      attendee: attendeeId,
      dieselManager: dieselManagerId,
      stockManager: stockManagerId,
    });
    await project.save();

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: "Unable to create project", error });
  }
};

exports.assignAttendeeToProject = async (req, res) => {
  const { attendeeId } = req.body;
  const { projectId } = req.params;

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Ensure the attendee is not assigned to another project
    const existingAssignment = await Project.findOne({ attendee: attendeeId });
    if (existingAssignment) {
      return res
        .status(400)
        .json({ message: "Attendee is already assigned to another project" });
    }

    project.attendee = attendeeId;
    await project.save();
    res.status(200).json(project);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to assign attendee to project", error });
  }
};

exports.listProjects = async (req, res) => {
  try {
    const { filter } = req.query;

    let query = {};
    if (filter === "incomplete") {
      query.done = false;
    } else if (filter === "complete") {
      query.done = true;
    }

    const projects = await Project.find(query)
      .populate("attendee", "username")
      .populate("dieselManager", "username")
      .populate("stockManager", "username");

    projects.forEach((project) => {
      console.log(
        `Project Name: ${project.name}, Attendee ID: ${project.attendee?._id}, Attendee Username: ${project.attendee?.username}, Diesel Manager ID: ${project.dieselManager?._id}, Diesel Manager Username: ${project.dieselManager?.username}, Stock Manager ID: ${project.stockManager?._id}, Stock Manager Username: ${project.stockManager?.username}`
      );
    });

    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: "Failed to list projects", error });
  }
};

exports.getProjectById = async (req, res) => {
  const { projectId } = req.params;
  console.log(`Fetching project with ID: ${projectId}`); // Add this log

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.status(200).json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateProjectName = async (req, res) => {
  const { projectId } = req.params;
  const { name } = req.body;

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.name = name;
    await project.save();

    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: "Failed to update project", error });
  }
};

exports.markProjectAsDone = async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.done) {
      return res
        .status(400)
        .json({ message: "Project is already marked as done" });
    }

    project.done = true;
    project.attendee = null;
    await project.save();

    res.status(200).json({
      message: "Project marked as completed and attendee unassigned",
      project,
    });
  } catch (error) {
    console.error("Error marking project as done:", error); // Log the error
    res.status(500).json({
      message: "Failed to mark project as completed",
      error: error.message,
    });
  }
};

exports.deleteProject = async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      console.error(`Project not found with id: ${projectId}`);
      return res.status(404).json({ message: "Project not found" });
    }
    await Project.findByIdAndDelete(projectId);
    console.log(`Project with id: ${projectId} deleted successfully.`);
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ message: "Failed to delete project", error });
  }
};

exports.getAssignedProject = async (req, res) => {
  const { userId } = req.params;
  console.log(`Fetching project for attendee: ${userId}`);

  try {
    const project = await Project.findOne({
      attendee: userId,
      done: false,
    }).select("name");

    if (!project) {
      console.log("No project found for this attendee with done: false");
      return res.status(404).json({ message: "No assigned project found" });
    }

    console.log(`Project found: ${project.name}`);
    res.json(project);
  } catch (error) {
    console.error("Error fetching assigned project:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAssignedProjectForDieselManager = async (req, res) => {
  const { userId } = req.params;
  console.log(`Fetching project for diesel manager: ${userId}`);

  try {
    const project = await Project.findOne({
      dieselManager: userId,
      done: false,
    }).select("name");

    if (!project) {
      console.log("No project found for this diesel manager with done: false");
      return res.status(404).json({ message: "No assigned project found" });
    }

    console.log(`Project found: ${project.name}`);
    res.json(project);
  } catch (error) {
    console.error("Error fetching assigned project:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAssignedProjectForStockManager = async (req, res) => {
  const { userId } = req.params;
  console.log(`Fetching project for diesel manager: ${userId}`);

  try {
    const project = await Project.findOne({
      stockManager: userId,
      done: false,
    }).select("name");

    if (!project) {
      console.log("No project found for this stock manager with done: false");
      return res.status(404).json({ message: "No assigned project found" });
    }

    console.log(`Project found: ${project.name}`);
    res.json(project);
  } catch (error) {
    console.error("Error fetching assigned project:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAssignedProjectForStockManager = async (req, res) => {
  const { userId } = req.params;
  console.log(`Fetching project for stock manager: ${userId}`);

  try {
    const project = await Project.findOne({
      stockManager: userId,
      done: false,
    }).select("name");

    if (!project) {
      console.log("No project found for this stock manager with done: false");
      return res.status(404).json({ message: "No assigned project found" });
    }

    console.log(`Project found: ${project.name}`);
    res.json(project);
  } catch (error) {
    console.error("Error fetching assigned project:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAssignedProjectLabours = async (req, res) => {
  try {
    const userId = req.params.userId;

    const project = await Project.findOne({ attendee: userId })
      .populate({
        path: "labours",
        populate: { path: "contractor", select: "name" },
      })
      .populate("labours.attendance");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Modify labours to set contractor name to "Local Labour (ECPL)" if contractor is null
    const modifiedLabours = project.labours.map((labour) => {
      return {
        ...labour._doc,
        contractorName: labour.contractor
          ? labour.contractor.name
          : "Local Labour (ECPL)",
      };
    });

    res.status(200).json({ ...project._doc, labours: modifiedLabours });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ message: "Failed to fetch project", error });
  }
};

exports.getAssignedProjectPetiThekedars = async (req, res) => {
  try {
    const userId = req.params.userId;

    const project = await Project.findOne({ attendee: userId }).populate(
      "petiThekedars"
    );

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json(project);
  } catch (error) {
    console.error("Error fetching Peti Thekedars:", error);
    res.status(500).json({ message: "Failed to fetch Peti Thekedars", error });
  }
};

exports.getAssignedProjectDiesel = async (req, res) => {
  try {
    const userId = req.params.userId;

    const project = await Project.findOne({
      dieselManager: userId,
    });

    if (!project) {
      return res.status(404).json({ message: "No assigned project found" });
    }

    return res.status(200).json(project);
  } catch (error) {
    console.error("Error fetching assigned project:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
