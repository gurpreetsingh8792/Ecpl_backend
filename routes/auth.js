// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/Users");
const auth = require("../middleware/auth");

const router = express.Router();

// Login Route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Received login request:", { username, password }); // Log incoming request

  try {
    const user = await User.findOne({ username });
    console.log("User found:", user); // Log user data fetched from database

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch); // Log result of password comparison

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const payload = {
      id: user._id,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "15d",
    });
    console.log("Generated token:", token); // Log the generated JWT token

    res.json({ token });
  } catch (err) {
    console.error("Server error:", err.message); // Log any server errors
    res.status(500).send("Server error");
  }
});

router.get("/profile/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      res.json({ username: user.username });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

// Change Password Endpoint
router.post(
  "/change-password",
  auth([
    "superadmin",
    "admin",
    "attende",
    "stock_management",
    "diesel_management",
  ]),
  async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = req.user;

    try {
      const isMatch = await bcrypt.compare(oldPassword, user.password);

      if (!isMatch) {
        return res.status(400).json({ message: "Old password is incorrect" });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);

      await user.save();

      res.json({ message: "Password changed successfully" });
    } catch (err) {
      console.error("Server error:", err.message);
      res.status(500).send("Server error");
    }
  }
);

router.post("/superadmin/add-user", auth("superadmin"), async (req, res) => {
  const { username, password, role } = req.body;

  // Basic validation
  if (!username || !password || !role) {
    return res
      .status(400)
      .json({ message: "Username, password, and role are required" });
  }

  // Ensure the role is valid
  const validRoles = [
    "superadmin",
    "admin",
    "attende",
    "stock_management",
    "diesel_management",
  ];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      username,
      password: hashedPassword,
      role,
    });

    await newUser.save();

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/users", auth("superadmin"), async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});
router.get("/admin/users", auth("admin"), async (req, res) => {
  const { role } = req.query;

  try {
    let users;
    if (role) {
      users = await User.find({ role: role });
    } else {
      return res.status(400).json({ message: "Role parameter is required" });
    }

    if (users.length === 0) {
      return res
        .status(404)
        .json({ message: "No users found for the specified role" });
    }

    res.json(users);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Route to fetch Diesel Managers
router.get("/admin/users/diesel-managers", auth("admin"), async (req, res) => {
  try {
    const users = await User.find({ role: "diesel_management" });

    if (users.length === 0) {
      return res.status(404).json({ message: "No Diesel Managers found" });
    }

    res.json(users);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Route to fetch Stock Managers
router.get("/admin/users/stock-managers", auth("admin"), async (req, res) => {
  try {
    const users = await User.find({ role: "stock_management" });

    if (users.length === 0) {
      return res.status(404).json({ message: "No Stock Managers found" });
    }

    res.json(users);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/attendees", auth(["admin", "superadmin"]), async (req, res) => {
  try {
    const attendees = await User.find({ role: "attende" });
    res.json(attendees);
  } catch (error) {
    console.error("Error fetching attendees:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/users/:id", auth("superadmin"), async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Register Admin (Superadmin Only)
router.post("/register-admin", auth("superadmin"), async (req, res) => {
  const { username, password } = req.body;
  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    user = new User({
      username,
      password: await bcrypt.hash(password, 10),
      role: "admin",
    });

    await user.save();
    res.status(201).json({ message: "Admin registered successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Add Roles (Admin Only)
router.post("/add-role", auth("admin"), async (req, res) => {
  const { username, password, role } = req.body;
  if (!["attende", "stock_management", "diesel_management"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    user = new User({
      username,
      password: await bcrypt.hash(password, 10),
      role,
    });

    await user.save();
    res.status(201).json({ message: "Role added successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
