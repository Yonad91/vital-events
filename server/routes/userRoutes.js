import upload from "../middleware/upload.js";
import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import path from "path";
import { fileURLToPath } from "url";
import QRCode from "qrcode";
import fs from "fs";
import { generateCertificateHTML } from "../utils/certificateUtils.js";
import { generateCertificate, downloadCertificate } from "../controllers/certificateController.js";
import { getRegistrarEventStats } from "../controllers/userController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  registerUser,
  loginUser,
  getAllUsers,
  deleteUser,
  changeUserRole,
  getAdminStats,
  getPublicStats,
  approveEvent,
  rejectEvent,
  listManagerEvents,
  listAllEventsForManager,
  approveCertificateRequest,
  rejectCertificateRequest,
  registerEvent,
  updateEvent,
  listMyEvents,
  submitEventToManager,
  viewMyRecords,
  requestCertificate,
  generateRegistrationId,
  notificationsStream,
  getNotifications,
  markNotificationRead,
  hospitalRegisterEvent,
  churchRegisterEvent,
  mosqueRegisterEvent,
  updateProfile,
  updatePassword,
  getEventByRegistrationId,
  uploadProfilePic,
  requestCorrection,
  handleCorrection,
  verifyCertificate,
  listMyCertificates,
  deleteCertificateRequest,
  deleteEvent,
  checkDuplicateIdNumber,
  lookupBirthRecordByIdNumber,
  submitOperationalReport,
  submitOperationalReportWithPeriod,
  listMyReports,
  listOperationalReportsForManager,
  sendReportFeedback,
  getMyReceivedTemplates,
  sendLetterToManager,
  getMySentLetters,
  createReportTemplate,
  listReportTemplates,
  getReportTemplate,
  updateReportTemplate,
  deleteReportTemplate,
  sendReportTemplate,
  listSentTemplates,
  getReportingUsers,
} from "../controllers/userController.js";
// ...existing code...

const router = express.Router();

/**
 * ========================
 * PUBLIC ROUTES
 * ========================
 */
// Verify certificate (public endpoint - must be before auth middleware)
router.get("/verify/:certificateId", verifyCertificate);

/**
 * ========================
 * AUTH ROUTES
 * ========================
 */
router.post("/register", registerUser);
router.post("/login", loginUser);

// Public statistics endpoint for home page
router.get("/stats", getPublicStats);

// Server-Sent Events (SSE) notifications stream (accepts token via query or header)
router.get("/notifications/stream", notificationsStream);

/**
 * ========================
 * PROFILE ROUTES (ALL AUTHENTICATED USERS)
 * ========================
 */
router.use(
  authMiddleware([
    "admin",
    "manager",
    "registrar",
    "registrant",
    "hospital",
    "church",
    "mosque",
  ])
);
router.put("/me/profile", upload.single("profilePic"), updateProfile);
router.put("/me/password", updatePassword);
router.post("/me/profile-pic", upload.single("profilePic"), uploadProfilePic);
// Generate upfront registration number
router.post("/registration-id", generateRegistrationId);
// Lookup approved record by registrationId (all authenticated roles)
router.get("/records/:registrationId", getEventByRegistrationId);
// Check for duplicate ID card number (for real-time validation)
router.get("/check-duplicate-id", checkDuplicateIdNumber);
router.get("/birth-records/by-id", lookupBirthRecordByIdNumber);
// Notifications for authenticated users
router.get("/notifications", getNotifications);
router.patch("/notifications/:id/read", markNotificationRead);
// Certificates for current authenticated user (alias, works regardless of role)
router.get("/me/certificates", listMyCertificates);
// Reporting
router.post("/reports", submitOperationalReport);
router.post("/reports/with-period", submitOperationalReportWithPeriod);
router.get("/reports/mine", listMyReports);
router.get("/reports/received-templates", getMyReceivedTemplates);
router.post("/reports/send-letter", sendLetterToManager);
router.get("/reports/sent-letters", getMySentLetters);

// Debug endpoint to test certificate generation
router.post("/debug/generate-certificate", async (req, res) => {
  try {
    const { CertificateService } = await import("../services/certificateService.js");
    const certificateService = new CertificateService();
    
    // Mock data for testing
    const mockEvent = {
      _id: "test-event-id",
      type: "birth",
      data: {
        childName: "Test Child",
        fatherName: "Test Father",
        motherName: "Test Mother",
        registrationNumber: "TEST-001"
      }
    };
    
    const mockRequest = {
      _id: "test-request-id",
      verificationName: "Test Child",
      verificationFather: "Test Father",
      verificationGrandfather: "Test Grandfather"
    };
    
    const mockUser = {
      _id: "test-user-id",
      name: "Test User",
      email: "test@example.com"
    };
    
    console.log('🧪 Testing certificate generation via API...');
    const result = await certificateService.generateCertificate(mockEvent, mockRequest, mockUser);
    
    res.json({
      success: true,
      message: "Certificate generated successfully",
      certificateId: result.certificateId,
      pdfPath: result.pdfPath
    });
  } catch (error) {
    console.error('Debug certificate generation failed:', error);
    res.status(500).json({
      success: false,
      message: "Certificate generation failed",
      error: error.message
    });
  }
});

/**
 * ========================
 * ADMIN ROUTES
 * ========================
 */
router.use("/admin", authMiddleware(["admin"]));
router.get("/admin/users", getAllUsers);
router.get("/admin/stats", getAdminStats);
router.delete("/admin/users/:userId", deleteUser);
router.patch("/admin/users/:userId/role", changeUserRole);

/**
 * ========================
 * MANAGER ROUTES
 * ========================
 */
// Manager routes - all routes under /manager require manager role
router.use("/manager", authMiddleware(["manager"]));

// Manager event routes
router.get("/manager/events", listManagerEvents);
router.get("/manager/events/all", listAllEventsForManager);
router.get("/manager/reports", listOperationalReportsForManager);
router.patch("/manager/events/:eventId/approve", approveEvent);
router.patch("/manager/events/:eventId/reject", rejectEvent);
router.patch(
  "/manager/events/:eventId/certificates/:requestId/approve",
  approveCertificateRequest
);
router.patch(
  "/manager/events/:eventId/certificates/:requestId/reject",
  rejectCertificateRequest
);
router.patch("/manager/events/:eventId/corrections/:correctionId", handleCorrection);
router.delete(
  "/manager/events/:eventId/certificates/:requestId",
  deleteCertificateRequest
);
router.post("/manager/reports/:reportId/feedback", sendReportFeedback);

// Report Template routes
router.post("/manager/templates", createReportTemplate);
router.get("/manager/templates", listReportTemplates);
router.get("/manager/templates/:templateId", getReportTemplate);
router.put("/manager/templates/:templateId", updateReportTemplate);
router.delete("/manager/templates/:templateId", deleteReportTemplate);
router.post("/manager/templates/:templateId/send", sendReportTemplate);
router.get("/manager/templates/sent/list", listSentTemplates);
router.get("/manager/reporting-users", getReportingUsers);

/**
 * ========================
 * REGISTRAR ROUTES
 * ========================
 */
router.use("/registrar", authMiddleware(["registrar", "church", "mosque", "hospital"]));
router.get("/registrar/events", listMyEvents);
router.post("/registrar/events", upload.any(), registerEvent);
router.put("/registrar/events/:eventId", upload.any(), updateEvent);
router.patch("/registrar/events/:eventId/submit", submitEventToManager);
router.delete("/registrar/events/:eventId", deleteEvent);
router.get("/registrar/event-stats", getRegistrarEventStats);

/**
 * ========================
 * REGISTRANT ROUTES
 * ========================
 */
router.use("/registrant", authMiddleware(["registrant"]));
router.get("/registrant/events", viewMyRecords);
// List my certificate requests (including approved with download/verify links)
router.get("/registrant/certificates", listMyCertificates);
// Allow registrants to register/edit divorce events (multipart supported)
router.post("/registrant/events", upload.any(), registerEvent);
router.put("/registrant/events/:eventId", upload.any(), updateEvent);
router.post(
  "/registrant/events/:eventId/request-certificate",
  upload.single("image"),
  requestCertificate
);
router.post("/registrant/events/:eventId/request-correction", requestCorrection);
router.delete(
  "/registrant/events/:eventId/certificates/:requestId",
  authMiddleware(),
  deleteCertificateRequest
);

/**
 * ========================
 * HOSPITAL ROUTES
 * ========================
 */
router.use("/hospital", authMiddleware(["hospital"]));
router.get("/hospital/events", listMyEvents);
router.post("/hospital/events", upload.any(), hospitalRegisterEvent);
router.put("/hospital/events/:eventId", upload.any(), updateEvent);
router.patch("/hospital/events/:eventId/submit", submitEventToManager);
router.delete("/hospital/events/:eventId", deleteEvent);

/**
 * ========================
 * CHURCH ROUTES
 * ========================
 */
router.use("/church", authMiddleware(["church"]));
router.get("/church/events", listMyEvents);
router.post("/church/events", upload.any(), churchRegisterEvent);
router.put("/church/events/:eventId", upload.any(), updateEvent);
router.patch("/church/events/:eventId/submit", submitEventToManager);
router.delete("/church/events/:eventId", deleteEvent);

/**
 * ========================
 * MOSQUE ROUTES
 * ========================
 */
router.use("/mosque", authMiddleware(["mosque"]));
router.get("/mosque/events", listMyEvents);
router.post("/mosque/events", upload.any(), mosqueRegisterEvent);
router.put("/mosque/events/:eventId", upload.any(), updateEvent);
router.patch("/mosque/events/:eventId/submit", submitEventToManager);
router.delete("/mosque/events/:eventId", deleteEvent);

/**
 * ========================
 * CERTIFICATE ROUTES
 * ========================
 */
// Download certificate (requires authentication)
router.get("/certificates/:certificateId/download", authMiddleware(), downloadCertificate);

// Generate certificate endpoint for registrants (uses exact templates service)
router.post("/certificates/generate", authMiddleware(), generateCertificate);


export default router;
