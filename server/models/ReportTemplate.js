import mongoose from "mongoose";

const reportTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["message", "form", "template"],
      default: "message",
    },
    content: { type: String, required: true }, // HTML or text content
    formFields: { type: Object, default: {} }, // For form type templates
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Track sent templates
const sentTemplateSchema = new mongoose.Schema(
  {
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "ReportTemplate", required: true },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipients: {
      type: {
        allRoles: { type: Boolean, default: false },
        roles: [{ type: String }], // registrar, hospital, church, mosque
        specificUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      },
      required: true,
    },
    sentAt: { type: Date, default: Date.now },
    recipientsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ReportTemplate = mongoose.models.ReportTemplate || mongoose.model("ReportTemplate", reportTemplateSchema);
const SentTemplate = mongoose.models.SentTemplate || mongoose.model("SentTemplate", sentTemplateSchema);

export { ReportTemplate, SentTemplate };

