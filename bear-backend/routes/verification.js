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
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

// ✅ Helper function to normalize verification status
const normalizeVerificationStatus = (status) => {
  if (!status) return null;
  const normalized = status.toLowerCase();
  if (normalized === "approved") {
    return "Approved"; // Keep "Approved" status
  }
  if (normalized === "verified") {
    return "Verified"; // Keep "Verified" status
  }
  return status; // Keep original case for other statuses
};

// ✅ Helper function to check if user is verified (handles both "Verified" and "Approved")
const isUserVerified = (status) => {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return normalized === "verified" || normalized === "approved";
};

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

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  console.log("🔍 Authenticating token for:", req.method, req.path);
  console.log("🔍 Authorization header:", req.headers.authorization ? "Present" : "Missing");
  
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("✅ Token decoded successfully for user:", decoded.id);
    req.user = decoded;
    next();
  } catch (error) {
    console.log("❌ Token verification failed:", error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};


/**
 * @route   POST /api/verification/fix-upload
 * @desc    Fix endpoint to manually add uploaded files to database (no auth required for debugging)
 */
router.post("/fix-upload", async (req, res) => {
  try {
    console.log("🔧 FIX UPLOAD ENDPOINT HIT");
    
    // Find the most recent user (likely the one who uploaded)
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);
    
    if (recentUsers.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }
    
    const user = recentUsers[0]; // Most recent user
    console.log(`🔧 Adding uploaded file to: ${user.firstName} ${user.lastName}`);
    
    // Add the uploaded file to their verification documents
    const uploadedFile = {
      type: "1758766339050_hh33gr_CAMERA_20250925_101156_2466369510778498623.jpg",
      description: "verification document",
      uploadedAt: new Date("2025-09-25T02:13:59.050Z"),
      uploadedBy: user._id,
      originalName: "CAMERA_20250925_101156_2466369510778498623.jpg",
      fileSize: 245760,
      mimetype: "image/jpeg"
    };
    
    // Add to existing documents or create new array
    user.verificationDocuments = [...(user.verificationDocuments || []), uploadedFile];
    user.verificationStatus = "Pending";
    user.rejectionReason = null;
    
    await user.save();
    
    console.log('✅ Successfully added uploaded file to database');
    
    res.json({
      message: "Successfully fixed uploaded file",
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email
      },
      documentCount: user.verificationDocuments.length,
      status: user.verificationStatus
    });
    
  } catch (error) {
    console.error("🔧 Fix upload error:", error);
    res.status(500).json({ 
      message: "Failed to fix uploaded file",
      error: error.message
    });
  }
});


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

/**
 * @route   GET /api/verification/pending
 * @desc    Get all pending verifications (Web dashboard only)
 */
router.get("/pending", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Check if user is admin - check Admin table first, then User table
    let isAdmin = false;
    let adminUser = null;
    
    // First check Admin table (for admin users)
    const admin = await Admin.findById(req.user.id);
    
    if (admin && admin.role === "Admin") { 
      isAdmin = true;
    } else {
      // Check User table (for users with Admin role)
      adminUser = await User.findById(req.user.id);
      
      if (adminUser && adminUser.role === "Admin") {
        isAdmin = true;
      }
    }
    
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

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
    const adminId = req.user.id;

    // Check if user is admin - check Admin table first, then User table
    let isAdmin = false;
    
    // First check Admin table (for admin users)
    const admin = await Admin.findById(adminId);
    if (admin && admin.role === "Admin") {
      isAdmin = true;
    } else {
      // Check User table (for users with Admin role)
      const adminUser = await User.findById(adminId);
      if (adminUser && adminUser.role === "Admin") {
        isAdmin = true;
      }
    }
    
    if (!isAdmin) {
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
    console.log("🔍 Verification update endpoint hit");
    console.log("🔍 Request method:", req.method);
    console.log("🔍 Request URL:", req.url);
    console.log("🔍 Headers:", req.headers);
    console.log("🔍 Body:", req.body);
    console.log("🔍 Params:", req.params);
    console.log("🔍 User from token:", req.user);
    
    const { status, rejectionReason } = req.body;
    const { userId } = req.params;
    const adminId = req.user.id;
    
    console.log("🔍 Processing verification update:");
    console.log("🔍 - User ID:", userId);
    console.log("🔍 - Admin ID:", adminId);
    console.log("🔍 - Status:", status);
    console.log("🔍 - Rejection Reason:", rejectionReason);

    // Validate status
    if (!["Verified", "Approved", "Rejected"].includes(status)) {
      console.log("❌ Invalid status:", status);
      return res.status(400).json({ message: "Status must be 'Verified', 'Approved', or 'Rejected'" });
    }

    // Check if user is admin - check Admin table first, then User table
    console.log("🔍 Checking admin permissions...");
    let isAdmin = false;
    
    // First check Admin table (for admin users)
    console.log("🔍 Checking Admin table for admin ID:", adminId);
    const admin = await Admin.findById(adminId);
    console.log("🔍 Admin table result:", admin ? `${admin.username} (${admin.role})` : "Not found");
    
    if (admin && admin.role === "Admin") {
      isAdmin = true;
      console.log("✅ Admin found in Admin table");
    } else {
      // Check User table (for users with Admin role)
      console.log("🔍 Checking User table for admin ID:", adminId);
      const adminUser = await User.findById(adminId);
      console.log("🔍 User table result:", adminUser ? `${adminUser.firstName} ${adminUser.lastName} (${adminUser.role})` : "Not found");
      
      if (adminUser && adminUser.role === "Admin") {
        isAdmin = true;
        console.log("✅ Admin found in User table");
      }
    }
    
    if (!isAdmin) {
      console.log("❌ Access denied - not admin in either table");
      return res.status(403).json({ message: "Admin access required" });
    }
    
    console.log("✅ Admin access confirmed");

    // Find user to verify
    console.log("🔍 Looking for user to verify with ID:", userId);
    const user = await User.findById(userId);
    if (!user) {
      console.log("❌ User not found with ID:", userId);
      return res.status(404).json({ message: "User not found" });
    }
    console.log("✅ Found user to verify:", user.firstName, user.lastName);
    console.log("🔍 Current verification status:", user.verificationStatus);
    console.log("🔍 Current verification documents count:", user.verificationDocuments ? user.verificationDocuments.length : 0);

    // 🗑️ DELETE VERIFICATION DOCUMENTS (both files and database records)
    let deletedFilesCount = 0;
    if (user.verificationDocuments && user.verificationDocuments.length > 0) {
      console.log(`🗑️ Deleting ${user.verificationDocuments.length} verification documents for user ${user.firstName} ${user.lastName}`);
      
      // Delete physical files from filesystem
      for (const doc of user.verificationDocuments) {
        const filePath = path.join(uploadsDir, doc.type);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✅ Deleted file: ${doc.type}`);
            deletedFilesCount++;
          } else {
            console.log(`⚠️ File not found: ${doc.type}`);
          }
        } catch (fileError) {
          console.error(`❌ Error deleting file ${doc.type}:`, fileError);
          // Continue with other files even if one fails
        }
      }
      
      // Clear verification documents from database
      user.verificationDocuments = [];
      console.log(`✅ Cleared verification document references from database`);
    }

    // Update verification status
    console.log("🔍 Updating user verification status...");
    user.verificationStatus = normalizeVerificationStatus(status);
    user.verifiedBy = adminId;
    user.verifiedAt = new Date();
    
    if (status === "Rejected") {
      user.rejectionReason = rejectionReason || "Documents not sufficient for verification";
      console.log("🔍 Set rejection reason:", user.rejectionReason);
    } else {
      user.rejectionReason = null;
      console.log("🔍 Cleared rejection reason for approved user");
    }

    console.log("🔍 Saving user with new verification status:", status);
    await user.save();
    console.log("✅ User verification status updated successfully");

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
