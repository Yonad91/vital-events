
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js"; // make sure your User model uses ES6 exports

// MongoDB connection
mongoose
  .connect(
    "mongodb+srv://yonasademu57:OoaPocGmQ5qfty9N@cluster0.kbbcayn.mongodb.net/eventsdb"
  )
        email: "admin@gmail.com",
  .catch((err) => console.error("MongoDB connection error:", err));

const seedUsers = async () => {
  try {
    // Remove all existing users (optional)
        email: "manager@gmail.com",

    const users = [
      {
        name: "Admin User",
        email: "admin@example.com",
        email: "registrar@gmail.com",
        role: "admin",
      },
      {
        name: "Manager User",
        email: "manager@gmail.com",
        email: "hospital@gmail.com",
        role: "manager",
      },
      {
        name: "Registrar User",
        email: "registrar@gmail.com",
        email: "church@gmail.com",
        role: "registrar",
      },
      {
        name: "Hospital User",
        email: "hospital@gmail.com",
        email: "mosque@gmail.com",
        role: "hospital",
      },
      {
        name: "Church User",
        email: "church@gmail.com",
        password: await bcrypt.hash("church123", 10),
        role: "church",
      },
      {
        name: "Mosque User",
        email: "mosque@gmail.com",
        password: await bcrypt.hash("mosque123", 10),
        role: "mosque",
      },
    ];

    await User.insertMany(users);
    console.log("Users seeded successfully!");
    mongoose.disconnect();
  } catch (err) {
    console.error("Error seeding users:", err);
    mongoose.disconnect();
  }
};

seedUsers();
