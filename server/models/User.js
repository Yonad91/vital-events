import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    role: {
      type: String,
      enum: [
        "admin",
        "manager",
        "registrar",
        "hospital",
        "church",
        "mosque",
        "registrant",
      ],
      required: true,
      default: "registrant",
    },
    password: { type: String, required: true },
    active: { type: Boolean, default: true }, // Changed to true for new users
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    profile: {
      phone: { type: String },
      address: { type: String },
      organization: { type: String }, // for hospital, church, mosque
      profilePic: { type: String }, // New field for profile picture URL
    },
  },
  {
    timestamps: true,
  }
);

// Remove the pre-save hook since password is already hashed in controller
// This prevents double hashing which was causing login issues

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
