const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { validateRegistration, validateLogin, handleValidationErrors } = require("../middleware/validation");
const { JWT_SECRET, normalizeVerificationStatus, generateJWT, formatUserResponse } = require("../utils/helpers");
const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (Resident or Responder)
 */
router.post("/register", validateRegistration, handleValidationErrors, async (req, res) => {
  try {
    
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

    // ✅ Check if user with same firstName and lastName already exists (case-insensitive)
    const existingUserByName = await User.findOne({
      firstName: { $regex: new RegExp(`^${firstName.trim()}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName.trim()}$`, 'i') }
    });
    if (existingUserByName) {
      console.log("❌ User with same name already exists:", `${firstName} ${lastName}`);
      return res.status(400).json({ 
        message: `A user with the name "${firstName} ${lastName}" is already registered` 
      });
    }

    // ✅ Validate age (must be 18 or older)
    if (birthday) {
      const birthDate = new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      // Adjust age if birthday hasn't occurred yet this year
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 18) {
        console.log("❌ User is under 18 years old:", age);
        return res.status(400).json({ 
          message: "You must be at least 18 years old to register" 
        });
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
router.post("/login", validateLogin, handleValidationErrors, async (req, res) => {
  try {
    
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    
    // ✅ Normalize email (trim and lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    // ✅ FIXED: Use case-insensitive email search
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } 
    });
    
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Generate JWT
    const token = generateJWT(
      { id: user._id, role: user.role, responderType: user.responderType }
    );
    
    // ✅ FIXED: Return actual verification status regardless of document existence
    // If user is verified/rejected, return that status even if documents were cleaned up
    let responseVerificationStatus = normalizeVerificationStatus(user.verificationStatus);
    
    // Only set to null if user has never submitted documents AND has no verification status
    if ((!user.verificationDocuments || user.verificationDocuments.length === 0) && 
        (!user.verificationStatus || user.verificationStatus === "Pending")) {
      responseVerificationStatus = null;
    }
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

    // Check if user exists
    if (!user) {
      console.log("❌ User not found with ID:", decoded.id);
      return res.status(404).json({ message: "User not found" });
    }

    // Determine verification status for response
    // If user hasn't submitted any documents yet, return null
    // Otherwise, return the actual verification status
    let responseVerificationStatus = normalizeVerificationStatus(user.verificationStatus);
    if (!user.verificationDocuments || user.verificationDocuments.length === 0) {
      responseVerificationStatus = null;
    }

    // ✅ Create response object using helper function
    const userResponse = formatUserResponse(user);
    res.json(userResponse);
  } catch (err) {
    console.error("❌ Profile Error:", err);
    res.status(500).json({ message: "Invalid or expired token" });
  }
});


module.exports = router;
