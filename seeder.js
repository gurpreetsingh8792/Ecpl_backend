// seeder.js
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/Users"); // Adjust the path according to your project structure

// Database connection
const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

// Hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
};

// Seed superadmins
const seedSuperAdmins = async () => {
  const superAdmins = [
    {
      username: "Nupur",
      password: "Ecpl@123",
      role: "superadmin",
    },
    // {
    //   username: 'superadmin2',
    //   password: 'SuperAdmin123!',
    //   role: 'superadmin',
    // },
  ];

  for (let admin of superAdmins) {
    admin.password = await hashPassword(admin.password);
    const newUser = new User(admin);
    await newUser.save();
  }
  console.log("Superadmins seeded");
};

// Execute seeder
const seedDb = async () => {
  await connectDb();
  await seedSuperAdmins();
  mongoose.connection.close();
};

seedDb();
