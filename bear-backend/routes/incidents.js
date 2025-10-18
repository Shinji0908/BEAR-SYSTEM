const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Incident = require("../models/Incident");
const User = require("../models/User");
const Message = require("../models/Message");
const { validateIncident, validateMessage, handleValidationErrors } = require("../middleware/validation");
const { 
  authenticateToken, 
  requireAuth, 
  requireAdmin, 
  requireIncidentAccess,
  requireAdminOrResponder 
} = require("../middleware/authorization");
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

/**
 * @route   POST /api/incidents
 * @desc    Report a new incident (Resident/Responder must be logged in)
 */
router.post("/", authenticateToken, requireAuth, validateIncident, handleValidationErrors, async (req, res) => {
  try {

    // Get user's contact info from Users table
    const reporter = await User.findById(req.user._id).select("firstName lastName contact email");
    if (!reporter) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create new incident - contact comes from user profile, not request body
    const { name, description, location, type } = req.body;
    if (!name || !location?.latitude || !location?.longitude) {
      return res.status(400).json({ message: "name and location(lat, lng) are required" });
    }

    // Normalize and validate type
    const allowedTypes = ["barangay", "fire", "hospital", "police"];
    const normalizedType = typeof type === "string" ? type.toLowerCase() : undefined;
    const finalType = allowedTypes.includes(normalizedType) ? normalizedType : undefined; // model default applies

    const incident = new Incident({
      name,
      description: description || "", 
      contact: reporter.contact || "N/A", 
      location,
      type: finalType,
      reportedBy: req.user._id,
    });

    await incident.save();

    // 🔔 Emit real-time event
    const io = req.app.get("io");
    if (io) {
      // Populate the incident with reporter details
      const populatedIncident = await Incident.findById(incident._id)
        .populate({
          path: "reportedBy",
          select: "firstName lastName contact email",
          strictPopulate: false,
        })
        .lean();
        
      // ✅ Broadcast to all clients
      io.emit("incidentCreated", { incident: populatedIncident });
    }

    res.status(201).json({ message: "Incident reported successfully", incident });
  } catch (error) {
    console.error("❌ Save error:", error);
    res.status(500).json({ message: "Failed to report incident" });
  }
});

/**
 * @route   GET /api/incidents
 * @desc    Get all incidents with user info
 */
router.get("/", authenticateToken, requireAuth, async (req, res) => {
  try {
    let query = {};
    
    // Non-admin users can only see incidents they reported or are relevant to their role
    if (req.user.role !== 'Admin') {
      if (req.user.role === 'Responder' && req.user.responderType) {
        // Responders see incidents of their type
        const typeMapping = {
          'police': ['police', 'barangay'],
          'fire': ['fire'],
          'hospital': ['hospital'],
          'barangay': ['barangay', 'police']
        };
        
        const allowedTypes = typeMapping[req.user.responderType] || [];
        query = {
          $or: [
            { reportedBy: req.user._id }, // Their own incidents
            { type: { $in: allowedTypes } } // Incidents of their type
          ]
        };
      } else {
        // Residents only see their own incidents
        query = { reportedBy: req.user._id };
      }
    }

    const incidents = await Incident.find(query).populate({
      path: "reportedBy",
      select: "firstName lastName contact email role",
      strictPopulate: false,
    }).lean();
    res.json(incidents);
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   PUT /api/incidents/:id/status
 * @desc    Update incident status (Responders/Admin only)
 */
router.put("/:id/status", authenticateToken, requireAdminOrResponder, requireIncidentAccess, async (req, res) => {
  try {

    const { id } = req.params;
    const { status } = req.body;

    // ✅ Validate status
    const allowedStatuses = ["Pending", "In Progress", "Resolved"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        message: "Invalid status. Must be one of: " + allowedStatuses.join(", ") 
      });
    }

    // ✅ Find and update the incident
    const incident = await Incident.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate({
      path: "reportedBy",
      select: "firstName lastName contact email",
      strictPopulate: false,
    });

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    // 🔔 Emit real-time event
    const io = req.app.get("io");
    if (io) {
      // ✅ Broadcast to all clients
      io.emit("incidentStatusUpdated", { incident });
    }

    res.json({ 
      message: "Incident status updated successfully", 
      incident 
    });
  } catch (error) {
    console.error("❌ Status update error:", error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid token" });
    }
    res.status(500).json({ message: "Failed to update incident status" });
  }
});

/**
 * @route   GET /api/incidents/:incidentId/messages
 * @desc    Get chat messages for a specific incident (Resident or assigned Responder only)
 */
router.get("/:incidentId/messages", async (req, res) => {
  try {
    // ✅ Verify token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const { incidentId } = req.params;

    // ✅ Validate incidentId
    if (!incidentId) {
      return res.status(400).json({ message: "Incident ID is required" });
    }

    // ✅ Check if incident exists
    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    // ✅ Get user info
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Authorization: Only the resident who reported the incident or responders can access chat
    const isReporter = incident.reportedBy.toString() === decoded.id;
    const isResponder = user.role === "Responder" && user.verificationStatus === "Verified";
    const isAdmin = user.role === "Admin";

    if (!isReporter && !isResponder && !isAdmin) {
      return res.status(403).json({ 
        message: "Access denied. Only the incident reporter, verified responders, or admins can view chat messages." 
      });
    }

    // ✅ Get messages for this incident, sorted by timestamp
    const messages = await Message.find({ incidentId })
      .sort({ timestamp: 1 }) // Chronological order
      .lean();

    // ✅ Format messages for response
    const formattedMessages = messages.map(msg => ({
      messageId: msg._id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      content: msg.content,
      timestamp: msg.timestamp
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error("❌ Get messages error:", error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid token" });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ message: "Invalid incident ID format" });
    }
    res.status(500).json({ message: "Failed to retrieve messages" });
  }
});

/**
 * @route   DELETE /api/incidents/:id
 * @desc    Delete an incident (Admin only)
 */
router.delete("/:id", authenticateToken, requireAdmin, requireIncidentAccess, async (req, res) => {
  try {

    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Incident ID is required" });

    // Find and delete the incident
    const incident = await Incident.findByIdAndDelete(id);
    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    // 🔔 Emit real-time event
    const io = req.app.get("io");
    if (io) {
      // ✅ Broadcast to all clients
      io.emit("incidentDeleted", { incidentId: id, incident });
    }

    res.json({ message: "Incident deleted successfully", incident });
  } catch (error) {
    console.error("❌ Delete error:", error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid token" });
    }
    res.status(500).json({ message: "Failed to delete incident" });
  }
});

/**
 * @route   DELETE /api/incidents
 * @desc    Delete all incidents (Admin only)
 */
router.delete("/", authenticateToken, requireAdmin, async (req, res) => {
  try {

    const result = await Incident.deleteMany({});

    // 🔔 Emit real-time event for mass clear
    const io = req.app.get("io");
    if (io) {
      io.emit("incidentsCleared", { deletedCount: result.deletedCount });
    }

    return res.json({ message: "All incidents deleted", deletedCount: result.deletedCount });
  } catch (error) {
    console.error("❌ Bulk delete error:", error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid token" });
    }
    return res.status(500).json({ message: "Failed to delete all incidents" });
  }
});

module.exports = router;