import app from './app.js';

//export default app;
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Middleware
const app = express();
// Disable etag to avoid 304 interfering with JSON payload visibility
app.set('etag', false);
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
import userRoutes from "./routes/userRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";
import enhancedCertificateRoutes from "./routes/enhancedCertificateRoutes.js";
import officialBirthCertificateRoutes from "./routes/officialBirthCertificateRoutes.js";

// Database Connection
const uri = process.env.MONGO_URI;
console.log(
  "Has MONGO_URI:", !!uri,
  "URI host ok:", uri ? /kbbcayn\.mongodb\.net/.test(uri) : false
);
mongoose
  .connect(uri)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Use merged user routes
app.use("/api/users", userRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/enhanced-certificates", enhancedCertificateRoutes);
app.use("/api/official-birth-certificates", officialBirthCertificateRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("🚀 Vital Events Registration API is running...");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Export the Express app for testing (Supertest) and other programmatic uses
export default app;
