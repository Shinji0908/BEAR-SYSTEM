const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// ✅ Helper function to normalize verification status
const normalizeVerificationStatus = (status) => {
  if (!status) return null;
  const normalized = status.toLowerCase();
  if (normalized === "approved" || normalized === "verified") {
    return "Verified"; // Standardize to "Verified"
  }
  return status; // Keep original case for other statuses
};

// ✅ Helper function to check if user is verified (handles both "Verified" and "Approved")
const isUserVerified = (status) => {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return normalized === "verified" || normalized === "approved";
}; // 🔐 move this to .env

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (Resident or Responder)
 */
router.post("/register", async (req, res) => {
  try {
    console.log("🔍 Register endpoint hit - Method:", req.method, "URL:", req.url);
    console.log("🔍 Headers:", req.headers);
    console.log("🔍 Body:", req.body);
    
    const { firstName, lastName, username, email, contact, password, role, responderType, birthday } = req.body;
    
    // ✅ Normalize email (trim and lowercase)
    const normalizedEmail = email.trim().toLowerCase();

    // ✅ Validate required fields
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ 
        message: "Missing required fields: firstName, lastName, email, password, role are required" 
      });
    }

    // ✅ Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // ✅ Validate role
    const validRoles = ["Resident", "Responder"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        message: "Invalid role. Must be 'Resident' or 'Responder'" 
      });
    }

    // ✅ If role is Responder, validate responderType
    if (role === "Responder" && !responderType) {
      return res.status(400).json({ 
        message: "responderType is required when role is 'Responder'" 
      });
    }

    // ✅ Generate username if not provided
    let finalUsername = username || `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${Date.now()}`;

    // ✅ Check if email already exists (case-insensitive)
    const existingUserByEmail = await User.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } 
    });
    if (existingUserByEmail) {
      console.log("❌ Email already exists:", normalizedEmail);
      return res.status(400).json({ message: "Username or email already exists" });
    }

    // ✅ Check username uniqueness (case-insensitive)
    const existingUserByUsername = await User.findOne({ 
      username: { $regex: new RegExp(`^${finalUsername}$`, 'i') } 
    });
    if (existingUserByUsername) {
      console.log("❌ Username already exists:", finalUsername);
      return res.status(400).json({ message: "Username or email already exists" });
    }

    // ✅ Check contact uniqueness (if contact is provided)
    if (contact && contact.trim()) {
      const existingUserByContact = await User.findOne({ contact: contact.trim() });
      if (existingUserByContact) {
        console.log("❌ Contact number already exists:", contact.trim());
        return res.status(400).json({ message: "Contact number already exists" });
      }
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Create user
    const newUser = new User({
      firstName,
      lastName,
      username: finalUsername,
      email: normalizedEmail, // Use normalized email
      contact: contact ? contact.trim() : null, // Trim contact number
      password: hashedPassword,
      role,
      responderType: role === "Responder" ? responderType : null,
      birthday: birthday || null,
    });

    await newUser.save();

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id.toString(),  // ✅ Convert ObjectId to string for Android compatibility
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        responderType: newUser.responderType,
        birthday: newUser.birthday,
      },
    });
  } catch (err) {
    console.error("❌ Register Error:", err);
    if (err.code === 11000) {
      // MongoDB duplicate key error
      const field = Object.keys(err.keyPattern)[0];
      console.log("❌ Duplicate key error on field:", field);
      return res.status(400).json({ message: "Username or email already exists" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login for Residents & Responders
 */
router.post("/login", async (req, res) => {
  try {
    //  ADDED: Comprehensive logging for debugging
    console.log("🔍 Login endpoint hit - Method:", req.method, "URL:", req.url);
    console.log("🔍 Headers:", req.headers);
    console.log("🔍 Body:", req.body);
    
    const { email, password } = req.body;
    
    // 🔍 ADDED: Validate required fields with logging
    if (!email || !password) {
      console.log("❌ Missing email or password");
      return res.status(400).json({ message: "Email and password are required" });
    }
    
    // ✅ Normalize email (trim and lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    
    // 🔍 ADDED: Log normalized email and password length
    console.log("🔍 Normalized email:", normalizedEmail);
    console.log("🔍 Password length:", password.length);

    // 🔍 ADDED: Log user search
    console.log(" Searching for user with email:", normalizedEmail);
    // ✅ FIXED: Use case-insensitive email search
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } 
    });
    
    if (!user) {
      console.log("❌ User not found with email:", normalizedEmail);
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    // 🔍 ADDED: Log user details found
    console.log("✅ User found:", {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      responderType: user.responderType,
      verificationStatus: user.verificationStatus,
      verificationDocuments: user.verificationDocuments ? user.verificationDocuments.length : 0
    });

    //  ADDED: Log password comparison
    console.log("🔍 Comparing password...");
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log("❌ Password mismatch for user:", user.email);
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    // 🔍 ADDED: Log successful password match
    console.log("✅ Password match confirmed");

    // ✅ Generate JWT
    //  ADDED: Log JWT generation
    console.log(" Generating JWT token...");
    const token = jwt.sign(
      { id: user._id, role: user.role, responderType: user.responderType },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    console.log("✅ JWT token generated");

    // 📝 Log the user login activity

    // ✅ Determine verification status for response
    // If user hasn't submitted any documents yet, return null
    // Otherwise, return the actual verification status
    
    // 🔍 ADDED: Log verification status processing
    console.log(" Processing verification status...");
    console.log("🔍 Raw verificationStatus:", user.verificationStatus);
    console.log("🔍 verificationDocuments:", user.verificationDocuments);
    
    // ✅ FIXED: Return actual verification status regardless of document existence
    // If user is verified/rejected, return that status even if documents were cleaned up
    let responseVerificationStatus = normalizeVerificationStatus(user.verificationStatus);
    
    // Only set to null if user has never submitted documents AND has no verification status
    if ((!user.verificationDocuments || user.verificationDocuments.length === 0) && 
        (!user.verificationStatus || user.verificationStatus === "Pending")) {
      console.log("🔍 No documents and no verification status, setting to null");
      responseVerificationStatus = null;
    } else {
      console.log("🔍 Returning actual verification status:", responseVerificationStatus);
    }

    // 🔍 ADDED: Log response data before sending
    const responseData = {
      message: "Login successful",
      token,
      user: {
        id: user._id.toString(),  // ✅ Convert ObjectId to string for Android compatibility
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        contact: user.contact,
        role: user.role,
        responderType: user.responderType,
        verificationStatus: responseVerificationStatus,
      },
    };
    
    console.log("✅ Login successful, sending response:", {
      message: responseData.message,
      userId: responseData.user.id,
      userRole: responseData.user.role,
      userResponderType: responseData.user.responderType,
      verificationStatus: responseData.user.verificationStatus
    });

    res.json(responseData);
  } catch (err) {
    console.error("❌ Login Error:", err);
    // 🔍 ADDED: Log error stack trace
    console.error("❌ Error stack:", err.stack);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user's profile (protected)
 */
router.get("/profile", async (req, res) => {
  try {
    console.log("🔍 Profile endpoint hit - Method:", req.method, "URL:", req.url);
    console.log("🔍 Headers:", req.headers);
    
    const authHeader = req.headers.authorization;
    console.log("🔍 Authorization header:", authHeader);
    
    if (!authHeader) {
      console.log("❌ No authorization header provided");
      return res.status(401).json({ message: "No token provided" });
    }
    
    const token = authHeader.split(" ")[1];
    if (!token) {
      console.log("❌ No token found in authorization header");
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    // ✅ Check if user exists
    if (!user) {
      console.log("❌ User not found with ID:", decoded.id);
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Determine verification status for response
    // If user hasn't submitted any documents yet, return null
    // Otherwise, return the actual verification status
    let responseVerificationStatus = normalizeVerificationStatus(user.verificationStatus);
    if (!user.verificationDocuments || user.verificationDocuments.length === 0) {
      responseVerificationStatus = null;
    }

    // ✅ Create response object with explicit field mapping (consistent with login endpoint)
    const userResponse = {
      id: user._id.toString(),  // ✅ Convert ObjectId to string for Android compatibility
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      contact: user.contact,
      role: user.role,
      responderType: user.responderType,
      birthday: user.birthday,
      verificationStatus: responseVerificationStatus,
      createdAt: user.createdAt
    };

    res.json(userResponse);
  } catch (err) {
    console.error("❌ Profile Error:", err);
    res.status(500).json({ message: "Invalid or expired token" });
  }
});

/**
 * @route   GET /api/auth/debug/users
 * @desc    TEMPORARY: List all users for debugging
 */
router.get("/debug/users", async (req, res) => {
  try {
    console.log("🔍 Debug: Listing all users");
    const users = await User.find({}).select("-password");
    console.log("🔍 Found users:", users.length);
    
    const userList = users.map(user => ({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      responderType: user.responderType,
      verificationStatus: user.verificationStatus
    }));
    
    res.json({
      message: `Found ${users.length} users`,
      users: userList
    });
  } catch (err) {
    console.error("❌ Debug users error:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
});

/**
 * @route   GET /api/auth/debug/check-user/:email
 * @desc    TEMPORARY: Check specific user by email
 */
router.get("/debug/check-user/:email", async (req, res) => {
  try {
    const email = req.params.email;
    console.log("🔍 Debug: Checking user with email:", email);
    
    // Try exact match
    const exactUser = await User.findOne({ email: email });
    console.log("🔍 Exact match result:", exactUser ? "Found" : "Not found");
    
    // Try case-insensitive match
    const caseInsensitiveUser = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    console.log("🔍 Case-insensitive match result:", caseInsensitiveUser ? "Found" : "Not found");
    
    // Try normalized email (like in login)
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUser = await User.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } 
    });
    console.log("🔍 Normalized match result:", normalizedUser ? "Found" : "Not found");
    
    res.json({
      email: email,
      normalizedEmail: normalizedEmail,
      exactMatch: exactUser ? "Found" : "Not found",
      caseInsensitiveMatch: caseInsensitiveUser ? "Found" : "Not found",
      normalizedMatch: normalizedUser ? "Found" : "Not found",
      userDetails: normalizedUser || caseInsensitiveUser || exactUser
    });
  } catch (err) {
    console.error("❌ Debug check user error:", err);
    res.status(500).json({ message: "Error checking user" });
  }
});

/**
 * @route   POST /api/auth/debug/verify-password
 * @desc    TEMPORARY: Verify password for debugging
 */
router.post("/debug/verify-password", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("🔍 Debug: Verifying password for email:", email);
    
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } 
    });
    
    if (!user) {
      return res.json({
        email: email,
        userFound: false,
        message: "User not found"
      });
    }
    
    console.log("🔍 User found, checking password...");
    console.log("🔍 Stored password hash:", user.password);
    console.log("🔍 Provided password:", password);
    
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("🔍 Password match result:", isMatch);
    
    res.json({
      email: email,
      userFound: true,
      passwordMatch: isMatch,
      storedHash: user.password,
      providedPassword: password
    });
  } catch (err) {
    console.error("❌ Debug verify password error:", err);
    res.status(500).json({ message: "Error verifying password" });
  }
});

/**
 * @route   GET /api/auth/debug/test-profile/:email
 * @desc    TEMPORARY: Test profile response for specific user
 */
router.get("/debug/test-profile/:email", async (req, res) => {
  try {
    const email = req.params.email;
    console.log("🔍 Debug: Testing profile response for email:", email);
    
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    }).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    console.log("🔍 Raw user._id:", user._id);
    console.log("🔍 Type of user._id:", typeof user._id);
    console.log("🔍 user._id.toString():", user._id.toString());
    
    // Test the exact same logic as the profile endpoint
    let responseVerificationStatus = normalizeVerificationStatus(user.verificationStatus);
    if (!user.verificationDocuments || user.verificationDocuments.length === 0) {
      responseVerificationStatus = null;
    }

    const userResponse = {
      id: user._id,  // ✅ Map _id to id for Android compatibility
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      contact: user.contact,
      role: user.role,
      responderType: user.responderType,
      birthday: user.birthday,
      verificationStatus: responseVerificationStatus,
      createdAt: user.createdAt
    };
    
    console.log("🔍 Final userResponse.id:", userResponse.id);
    console.log("🔍 Type of userResponse.id:", typeof userResponse.id);
    
    res.json({
      message: "Profile test response",
      rawUser: {
        _id: user._id,
        username: user.username,
        email: user.email
      },
      mappedResponse: userResponse
    });
  } catch (err) {
    console.error("❌ Debug test profile error:", err);
    res.status(500).json({ message: "Error testing profile" });
  }
});

module.exports = router;
