const express = require("express");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const { JWT_SECRET, generateJWT } = require("../utils/helpers");
const { authenticateToken } = require("../middleware/authorization");

const router = express.Router();

// POST /api/admin/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email, password required" });
    }

    const existing = await Admin.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(400).json({ message: "Admin username or email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ username, email, password: hashed, role: "Admin" });

    res.status(201).json({
      message: "Admin created",
      admin: { id: admin._id, username: admin.username, email: admin.email, role: admin.role },
    });
  } catch (err) {
    console.error("❌ Admin register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "username and password required" });
    }
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = generateJWT({ id: admin._id, role: admin.role, username: admin.username, isSystemAdmin: true });

    res.json({
      message: "Login successful",
      token,
      user: { id: admin._id, username: admin.username, email: admin.email, role: admin.role, isSystemAdmin: true },
    });
  } catch (err) {
    console.error("❌ Admin login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/profile - Get admin profile
router.get("/profile/:id", authenticateToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select("-password");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.json(admin);
  } catch (err) {
    console.error("❌ Get admin profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/admin/password/:id - Change admin password
router.put("/password/:id", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Validate new password strength (at least 8 chars, 1 uppercase, 1 lowercase, 1 number)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ 
        message: "Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one number" 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await Admin.findByIdAndUpdate(req.params.id, { password: hashedPassword });

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("❌ Change admin password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;


