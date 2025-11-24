// models/RegistrantData.js
import mongoose from "mongoose";

const registrantDataSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["birth", "death", "marriage"],
      required: true,
    },
    details: { type: Object, required: true }, // Flexible object to store form fields
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("RegistrantData", registrantDataSchema);
