const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Admin = require("../models/Admin");
const { 
  authenticateToken, 
  requireAuth, 
  requireAdmin, 
  requireUserManagementAccess,
  requireOwnership 
} = require("../middleware/authorization");
const { normalizeVerificationStatus, formatUserResponse } = require("../utils/helpers");

const router = express.Router();

// Using centralized authentication middleware

// Using centralized authorization middleware


/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 */
router.get("/", authenticateToken, requireUserManagementAccess, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    
    // ✅ Apply verification status logic to all users
    const usersWithCorrectedStatus = users.map(user => {
      const userObj = user.toObject();
      console.log(`🔍 Processing user: ${userObj.firstName} ${userObj.lastName}`);
      console.log(`🔍 Original verificationStatus: ${userObj.verificationStatus}`);
      console.log(`🔍 Documents count: ${userObj.verificationDocuments ? userObj.verificationDocuments.length : 0}`);
      
      // Normalize verification status first
      userObj.verificationStatus = normalizeVerificationStatus(userObj.verificationStatus);
      console.log(`🔍 After normalization: ${userObj.verificationStatus}`);
      
      // Only set to null if user has never submitted documents AND has no verification status
      if ((!userObj.verificationDocuments || userObj.verificationDocuments.length === 0) && 
          (!userObj.verificationStatus || userObj.verificationStatus === "Pending")) {
        console.log(`🔍 Setting to null - no documents and no status`);
        userObj.verificationStatus = null;
      }
      console.log(`🔍 Final verificationStatus: ${userObj.verificationStatus}`);
      return userObj;
    });
    
    res.json(usersWithCorrectedStatus);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Users can only view their own profile unless they're admin
    if (req.user.role !== "Admin" && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ Apply verification status logic
    const userObj = user.toObject();
    // Normalize verification status first
    userObj.verificationStatus = normalizeVerificationStatus(userObj.verificationStatus);
    
    // Only set to null if user has never submitted documents AND has no verification status
    if ((!userObj.verificationDocuments || userObj.verificationDocuments.length === 0) && 
        (!userObj.verificationStatus || userObj.verificationStatus === "Pending")) {
      userObj.verificationStatus = null;
    }

    res.json(userObj);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   POST /api/users
 * @desc    Create a new user (Admin only)
 */
router.post("/", authenticateToken, requireUserManagementAccess, async (req, res) => {
  try {
    // User creation logic
    const { firstName, lastName, username, email, contact, password, role, responderType, birthday } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ 
        message: "Missing required fields: firstName, lastName, email, password, role are required" 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate role
    const validRoles = ["Resident", "Responder", "Admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        message: "Invalid role. Must be 'Resident', 'Responder', or 'Admin'" 
      });
    }

    // If role is Responder, validate responderType
    if (role === "Responder" && !responderType) {
      return res.status(400).json({ 
        message: "responderType is required when role is 'Responder'" 
      });
    }

    // Generate username if not provided
    let finalUsername = username || `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${Date.now()}`;

    // Check if email already exists
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Check username uniqueness
    const existingUserByUsername = await User.findOne({ username: finalUsername });
    if (existingUserByUsername) {
      finalUsername = `${finalUsername}_${Date.now()}`;
    }

    // Check contact uniqueness (if contact is provided)
    if (contact && contact.trim()) {
      const existingUserByContact = await User.findOne({ contact: contact.trim() });
      if (existingUserByContact) {
        return res.status(400).json({ message: "Contact number already exists" });
      }
    }

    // Check if user with same firstName and lastName already exists (case-insensitive)
    const existingUserByName = await User.findOne({
      firstName: { $regex: new RegExp(`^${firstName.trim()}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName.trim()}$`, 'i') }
    });
    if (existingUserByName) {
      return res.status(400).json({ 
        message: `A user with the name "${firstName} ${lastName}" is already registered` 
      });
    }

    // Validate age (must be 18 or older)
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
        return res.status(400).json({ 
          message: "User must be at least 18 years old to register" 
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      firstName,
      lastName,
      username: finalUsername,
      email,
      contact: contact || null,
      password: hashedPassword,
      role,
      responderType: role === "Responder" ? responderType : null,
      birthday: birthday || null,
    });

    await newUser.save();

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        username: newUser.username,
        email: newUser.email,
        contact: newUser.contact,
        role: newUser.role,
        responderType: newUser.responderType,
        birthday: newUser.birthday,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Username or email already exists" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user by ID
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, username, email, contact, role, responderType, birthday, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Users can only update their own profile unless they're admin
    if (req.user.role !== "Admin" && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Validate email format if email is being updated
    if (email && email !== user.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if new email already exists
      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }
    }

    // Validate role if being updated (only admins can change roles)
    if (role && req.user.role === "Admin") {
      const validRoles = ["Resident", "Responder", "Admin"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ 
          message: "Invalid role. Must be 'Resident', 'Responder', or 'Admin'" 
        });
      }

      // If role is Responder, validate responderType
      if (role === "Responder" && !responderType) {
        return res.status(400).json({ 
          message: "responderType is required when role is 'Responder'" 
        });
      }
    }

    // Check username uniqueness if username is being updated
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }
    }

    // Update user fields
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (contact !== undefined) updateData.contact = contact;
    if (birthday !== undefined) updateData.birthday = birthday;
    
    // Handle password update if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }
    
    // Only admins can change role and responderType
    if (req.user.role === "Admin") {
      if (role) updateData.role = role;
      if (responderType !== undefined) updateData.responderType = responderType;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    res.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Username or email already exists" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user by ID (Admin only)
 */
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent admin from deleting themselves
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   PUT /api/users/:id/password
 * @desc    Update user password
 */
router.put("/:id/password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Users can only change their own password unless they're admin
    if (req.user.role !== "Admin" && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Verify current password (unless admin is changing someone else's password)
    if (req.user.role !== "Admin" || req.user._id.toString() === req.params.id) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(req.params.id, { password: hashedPassword });

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   PUT /api/users/:id/verify
 * @desc    Update responder verification status (Admin only)
 */
router.put("/:id/verify", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { verificationStatus, verificationNotes } = req.body;

    if (!verificationStatus) {
      return res.status(400).json({ message: "Verification status is required" });
    }

    const validStatuses = ["pending", "verified", "rejected"];
    if (!validStatuses.includes(verificationStatus)) {
      return res.status(400).json({ 
        message: "Invalid verification status. Must be 'pending', 'verified', or 'rejected'" 
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Only allow verification of responders
    if (user.role !== "Responder") {
      return res.status(400).json({ message: "Only responders can be verified" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { 
        verificationStatus,
        verificationNotes: verificationNotes || "",
        verifiedAt: verificationStatus === "verified" ? new Date() : null,
        verifiedBy: req.user._id
      },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({
      message: "Verification status updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating verification status:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
