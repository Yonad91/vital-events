import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    type: { type: String, enum: ["approved", "rejected", "submitted", "info"], required: true },
    message: { type: String, required: true },
    data: { type: Object },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

export default Notification;
