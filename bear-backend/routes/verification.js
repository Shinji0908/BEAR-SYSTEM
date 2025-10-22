const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const User = require("../models/User");
const Admin = require("../models/Admin");
const { 
  authenticateToken, 
  requireAuth, 
  requireAdmin, 
  requireVerificationAccess 
} = require("../middleware/authorization");
const { JWT_SECRET, normalizeVerificationStatus } = require("../utils/helpers");

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads/verification");

if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (error) {
    console.error("❌ Failed to create upload directory:", error);
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_random_originalname
    // Note: userId will be added later in the processing step since req.user isn't available here
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${timestamp}_${random}_${name}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only images and PDFs
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only images (JPEG, PNG) and PDF files are allowed"));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// ✅ Custom middleware to handle multer errors
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error("❌ Multer error:", err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: "File size too large. Maximum 5MB allowed." });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: "Too many files. Maximum 5 files allowed." });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: "Unexpected file field. Use 'documents' field." });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  if (err) {
    console.error("❌ File filter error:", err);
    return res.status(400).json({ message: err.message });
  }
  next();
};



/**
 * @route   POST /api/verification/upload-documents
 * @desc    Upload verification documents
 */
router.post("/upload-documents", authenticateToken, upload.array("documents", 5), handleUploadErrors, async (req, res) => {
  try {

    const { documentType, description } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!documentType || !req.files || req.files.length === 0) {
      return res.status(400).json({ 
        message: "Document type and at least one document file are required" 
      });
    }

    // Validate document type
    const allowedTypes = ["barangay_id", "utility_bill", "voter_id", "employment_cert", "authorization_letter", "other"];
    if (!allowedTypes.includes(documentType)) {
      return res.status(400).json({ 
        message: `Invalid document type. Allowed types: ${allowedTypes.join(', ')}` 
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Process uploaded files
    const documentPaths = req.files.map(file => {
      return {
        type: file.filename,
        description: description || `${documentType} document`,
        uploadedAt: new Date(),
        uploadedBy: userId,
        originalName: file.originalname,
        fileSize: file.size,
        mimetype: file.mimetype
      };
    });

    // Update user with new documents
    user.verificationDocuments = [...(user.verificationDocuments || []), ...documentPaths];
    user.verificationStatus = "Pending"; // Reset to pending when new documents are uploaded
    user.rejectionReason = null; // Clear any previous rejection reason

    console.log("🔍 Saving user with", user.verificationDocuments.length, "documents");
    await user.save();
    console.log("✅ User saved successfully");

    res.status(200).json({
      message: "Documents uploaded successfully",
      documents: documentPaths,
      verificationStatus: user.verificationStatus
    });

  } catch (error) {
    console.error("❌ Upload error details:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({ 
      message: "Failed to upload documents",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/verification/status
 * @desc    Get user's verification status
 */
router.get("/status", authenticateToken, async (req, res) => {
  try {
    console.log("🔍 Status endpoint hit for user:", req.user.id);
    const userId = req.user.id;

    const user = await User.findById(userId).select(
      "verificationStatus verificationDocuments verifiedAt rejectionReason firstName lastName role responderType"
    );

    if (!user) {
      console.log("❌ User not found for ID:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ Found user:", user.firstName, user.lastName);
    console.log("🔍 User verification status:", user.verificationStatus);
    console.log("🔍 User verification documents count:", user.verificationDocuments ? user.verificationDocuments.length : 0);

    // Convert file paths to URLs for frontend
    const documents = user.verificationDocuments.map(doc => ({
      type: doc.type,
      description: doc.description,
      uploadedAt: doc.uploadedAt,
      url: `/uploads/verification/${doc.type}` // Frontend will need to serve these files
    }));

    // ✅ FIXED: Apply verification status logic with normalization
    // Return actual verification status regardless of document existence
    let responseVerificationStatus = normalizeVerificationStatus(user.verificationStatus);
    
    // Only set to null if user has never submitted documents AND has no verification status
    if ((!user.verificationDocuments || user.verificationDocuments.length === 0) && 
        (!user.verificationStatus || user.verificationStatus === "Pending")) {
      responseVerificationStatus = null;
    }

    const response = {
      verificationStatus: responseVerificationStatus,
      verifiedAt: user.verifiedAt,
      rejectionReason: user.rejectionReason,
      documents: documents,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        responderType: user.responderType
      }
    };

    res.json(response);

  } catch (error) {
    console.error("❌ Status check error:", error);
    res.status(500).json({ message: "Failed to get verification status" });
  }
});


router.get("/pending", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const pendingUsers = await User.find({ 
      verificationStatus: "Pending",
      verificationDocuments: { $exists: true, $not: { $size: 0 } }
    }).select("firstName lastName email role responderType verificationDocuments createdAt contact");

    res.json(pendingUsers);

  } catch (error) {
    console.error("❌ Pending verifications error:", error);
    res.status(500).json({ message: "Failed to get pending verifications" });
  }
});

/**
 * @route   GET /api/verification/:userId/details
 * @desc    Get detailed user information for verification (Admin only)
 */
router.get("/:userId/details", authenticateToken, requireVerificationAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user._id;

    // Check if user is admin - only check Admin table since admins are not in User table
    const admin = await Admin.findById(adminId);
    
    if (!admin || admin.role !== "Admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Find user with all details
    const user = await User.findById(userId).select(
      "firstName lastName email contact role responderType verificationStatus verificationDocuments verifiedAt rejectionReason createdAt"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Convert file paths to URLs for frontend
    const documents = user.verificationDocuments.map(doc => ({
      type: doc.type,
      description: doc.description,
      uploadedAt: doc.uploadedAt,
      url: `${process.env.API_BASE_URL || 'http://localhost:5000'}/uploads/verification/${doc.type}`,
      filename: doc.type
    }));

    // ✅ FIXED: Apply verification status logic with normalization
    // Return actual verification status regardless of document existence
    let responseVerificationStatus = normalizeVerificationStatus(user.verificationStatus);
    
    // Only set to null if user has never submitted documents AND has no verification status
    if ((!user.verificationDocuments || user.verificationDocuments.length === 0) && 
        (!user.verificationStatus || user.verificationStatus === "Pending")) {
      responseVerificationStatus = null;
    }

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        contact: user.contact,
        role: user.role,
        responderType: user.responderType,
        verificationStatus: responseVerificationStatus,
        verifiedAt: user.verifiedAt,
        rejectionReason: user.rejectionReason,
        createdAt: user.createdAt
      },
      documents: documents
    });

  } catch (error) {
    console.error("❌ Get user details error:", error);
    res.status(500).json({ message: "Failed to get user details" });
  }
});

/**
 * @route   PUT /api/verification/:userId/verify
 * @desc    Approve or reject user verification (Web dashboard only)
 */
router.put("/:userId/verify", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const { userId } = req.params;
    const adminId = req.user._id;

    // Validate status
    if (!["Verified", "Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'Verified', 'Approved', or 'Rejected'" });
    }

    // Check if user is admin - only check Admin table since admins are not in User table
    const admin = await Admin.findById(adminId);
    
    if (!admin || admin.role !== "Admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Find user to verify
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🗑️ DELETE VERIFICATION DOCUMENTS (both files and database records)
    let deletedFilesCount = 0;
    if (user.verificationDocuments && user.verificationDocuments.length > 0) {
      // Delete physical files from filesystem
      for (const doc of user.verificationDocuments) {
        const filePath = path.join(uploadsDir, doc.type);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            deletedFilesCount++;
          }
        } catch (fileError) {
          console.error(`Error deleting file ${doc.type}:`, fileError);
          // Continue with other files even if one fails
        }
      }
      
      // Clear verification documents from database
      user.verificationDocuments = [];
    }

    // Update verification status
    user.verificationStatus = normalizeVerificationStatus(status);
    user.verifiedBy = adminId;
    user.verifiedAt = new Date();
    
    if (status === "Rejected") {
      user.rejectionReason = rejectionReason || "Documents not sufficient for verification";
    } else {
      user.rejectionReason = null;
    }

    await user.save();

    res.json({
      message: `User verification ${status.toLowerCase()} successfully. ${deletedFilesCount} documents cleaned up.`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        verificationStatus: user.verificationStatus,
        verifiedAt: user.verifiedAt,
        rejectionReason: user.rejectionReason
      },
      cleanup: {
        documentsDeleted: deletedFilesCount
      }
    });

  } catch (error) {
    console.error("❌ Verification update error:", error);
    res.status(500).json({ message: "Failed to update verification status" });
  }
});


module.exports = router;
