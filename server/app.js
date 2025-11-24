import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Middleware
const app = express();
app.set('etag', false);
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
import userRoutes from "./routes/userRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";
import enhancedCertificateRoutes from "./routes/enhancedCertificateRoutes.js";
import officialBirthCertificateRoutes from "./routes/officialBirthCertificateRoutes.js";
import { getPublicStats } from "./controllers/userController.js";

// Database Connection (fallback to config default)
import { MONGO_URI as CONFIG_MONGO_URI, PORT as CONFIG_PORT } from "./config.js";
const uri = process.env.MONGO_URI || CONFIG_MONGO_URI;
console.log(
  "Has MONGO_URI:", !!uri,
);
mongoose
  .connect(uri)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Use routes
app.get("/api/stats", getPublicStats); // Public stats alias for home page
app.use("/api/users", userRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/enhanced-certificates", enhancedCertificateRoutes);
app.use("/api/official-birth-certificates", officialBirthCertificateRoutes);

// Test Route
app.get("/", (_req, res) => {
  res.send("🚀 Vital Events Registration API is running...");
});

// Start server
const PORT = process.env.PORT || CONFIG_PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;

