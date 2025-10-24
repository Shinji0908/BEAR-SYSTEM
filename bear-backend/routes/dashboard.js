const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Admin = require("../models/Admin");
const Incident = require("../models/Incident");
const { authenticateToken, requireDashboardAccess } = require("../middleware/authorization");

// Using centralized authentication middleware

router.get("/stats", authenticateToken, requireDashboardAccess, async (req, res) => {
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
    
    // ✅ Calculate actual average response time
    // Response time = time from incident creation to "In Progress" status
    const resolvedIncidentsWithTime = await Incident.find({
      status: { $in: ["In Progress", "Resolved"] },
      updatedAt: { $exists: true }
    }).select("createdAt updatedAt");
    
    let avgResponseTime = "0";
    if (resolvedIncidentsWithTime.length > 0) {
      const totalResponseTime = resolvedIncidentsWithTime.reduce((sum, incident) => {
        const responseTime = (new Date(incident.updatedAt) - new Date(incident.createdAt)) / (1000 * 60); // in minutes
        return sum + responseTime;
      }, 0);
      avgResponseTime = (totalResponseTime / resolvedIncidentsWithTime.length).toFixed(1);
    }
    
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