import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["birth", "death", "marriage", "divorce", "special"],
      required: true,
    },
    registrationId: { type: String, required: true }, // Unique registration ID for all events
    // Store all submitted form fields without dropping unknown keys
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    registrarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected"],
      default: "draft",
    },
    submittedAt: { type: Date, default: Date.now },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    rejectedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Certificate management
    requestedCertificates: [
      {
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        requestedAt: { type: Date, default: Date.now },
        approvedAt: { type: Date },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rejectionReason: { type: String },
        certificateUrl: { type: String }, // URL to generated certificate
        certificateId: { type: String }, // Unique certificate ID
        certificatePath: { type: String }, // File path to certificate
        generatedAt: { type: Date }, // When certificate was generated
        certificateGenerationError: { type: String }, // Error message if generation failed
        verificationImage: { type: String }, // Path to verification image
        verificationName: { type: String }, // Name provided for verification
        verificationFather: { type: String }, // Father's name for verification
        verificationGrandfather: { type: String }, // Grandfather's name for verification
        verificationType: { type: String }, // Type of verification
      },
    ],

    // Special registration requests
    specialRegistration: {
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reason: { type: String },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      requestedAt: { type: Date, default: Date.now },
      approvedAt: { type: Date },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },

    // Audit trail
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastModifiedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
eventSchema.index({ registrationId: 1 }, { unique: true }); // Unique index for registrationId
eventSchema.index({ type: 1, status: 1 });
eventSchema.index({ registrarId: 1, status: 1 });
eventSchema.index({ status: 1, submittedAt: 1 });

const Event = mongoose.models.Event || mongoose.model("Event", eventSchema);

export default Event;
