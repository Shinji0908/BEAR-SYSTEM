const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/Admin");
const Incident = require("../models/Incident");
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Try to find user in User collection first
    let user = await User.findById(decoded.id).select("-password");
    
    // If not found in User collection, try Admin collection
    if (!user) {
      const admin = await Admin.findById(decoded.id).select("-password");
      if (admin) {
        req.user = admin;
        next();
        return;
      }
    } else {
      req.user = user;
      next();
      return;
    }
    
    return res.status(401).json({ message: "User not found" });
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const residents = await User.countDocuments({ role: "Resident" });
    const responders = await User.countDocuments({ role: "Responder" });
    const admins = await User.countDocuments({ role: "Admin" });
    
    const verifiedResponders = await User.countDocuments({ 
      role: "Responder", 
      verificationStatus: { $in: ["Verified", "Approved", "verified", "approved"] }
    });
    
    const totalIncidents = await Incident.countDocuments();
    const activeIncidents = await Incident.countDocuments({ 
      status: { $in: ["Pending", "In Progress"] } 
    });
    const resolvedIncidents = await Incident.countDocuments({ 
      status: "Resolved" 
    });
    
    const incidentsByType = await Incident.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 }
        }
      }
    ]);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentIncidents = await Incident.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    
    const avgResponseTime = "3.2";
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          residents,
          responders,
          admins,
          verifiedResponders,
          newUsers
        },
        incidents: {
          total: totalIncidents,
          active: activeIncidents,
          resolved: resolvedIncidents,
          recent: recentIncidents,
          byType: incidentsByType
        },
        metrics: {
          avgResponseTime,
          systemUptime: "99.9%",
          lastUpdated: new Date()
        }
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
});

router.get("/recent-activity", authenticateToken, async (req, res) => {
  try {
    const recentIncidents = await Incident.find()
      .populate("reportedBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name type status createdAt reportedBy");
    
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("firstName lastName role createdAt");
    
    res.json({
      success: true,
      data: {
        recentIncidents,
        recentUsers
      }
    });
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
});

module.exports = router;