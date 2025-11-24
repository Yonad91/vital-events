import mongoose from "mongoose";

const sampleEventSchema = new mongoose.Schema(
  {
    registrationId: { type: String },
    type: { type: String },
    status: { type: String },
    createdAt: { type: Date },
    summary: { type: String },
  },
  { _id: false }
);

const feedbackSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipients: [{ type: String }],
    includeReporter: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const reportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    summary: { type: String, required: true },
    notes: { type: String },
    metrics: { type: Object, default: {} }, // status breakdown, totals, etc.
    totalsByType: { type: Object, default: {} },
    insights: [{ type: String }],
    period: {
      key: { type: String },
      label: { type: String },
      start: { type: Date },
      end: { type: Date },
    },
    sampleEvents: { type: [sampleEventSchema], default: [] },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    submittedByRole: { type: String, required: true },
    status: {
      type: String,
      enum: ["submitted", "acknowledged", "responded"],
      default: "submitted",
    },
    feedback: { type: [feedbackSchema], default: [] },
    lastFeedbackAt: { type: Date },
    context: { type: Object, default: {} },
  },
  { timestamps: true }
);

const Report = mongoose.models.Report || mongoose.model("Report", reportSchema);

export default Report;

