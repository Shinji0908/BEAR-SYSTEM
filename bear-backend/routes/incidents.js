const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Incident = require("../models/Incident");
const User = require("../models/User");
const Message = require("../models/Message");
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

/**
 * @route   POST /api/incidents
 * @desc    Report a new incident (Resident/Responder must be logged in)
 */
router.post("/", async (req, res) => {
  try {
    // ✅ Verify token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET);

    // ✅ Get user's contact info from Users table
    const reporter = await User.findById(decoded.id).select("firstName lastName contact email");
    if (!reporter) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Create new incident - contact comes from user profile, not request body
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
      description: description || "", // ✅ NEW: Optional description field
      contact: reporter.contact || "N/A", // ✅ Get contact from user profile
      location,
      type: finalType,
      reportedBy: decoded.id,
    });

    await incident.save();

    // 📝 Log the incident creation activity

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
      
      console.log(`📢 New incident created`);
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
router.get("/", async (req, res) => {
  try {
    const incidents = await Incident.find().populate({
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
router.put("/:id/status", async (req, res) => {
  try {
    // ✅ Verify token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET);

    // ✅ Get user info to check role
    const user = await User.findById(decoded.id).select("role responderType");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Only Responders can update status (Admins use web dashboard)
    if (user.role !== "Responder") {
      return res.status(403).json({ message: "Only Responders can update incident status" });
    }

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

    // 📝 Log the incident status update activity

    // 🔔 Emit real-time event
    const io = req.app.get("io");
    if (io) {
      // ✅ Broadcast to all clients
      io.emit("incidentStatusUpdated", { incident });
      
      console.log(`📢 Incident status updated`);
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
router.delete("/:id", async (req, res) => {
  try {
    // ✅ Verify token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET);

    // ✅ Check if user is admin (you may want to add role checking here)
    // For now, we'll allow any authenticated user to delete
    // You can add role checking later: if (decoded.role !== 'admin') return res.status(403).json({ message: "Admin access required" });

    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Incident ID is required" });

    // Find and delete the incident
    const incident = await Incident.findByIdAndDelete(id);
    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    // 📝 Log the incident deletion activity

    // 🔔 Emit real-time event
    const io = req.app.get("io");
    if (io) {
      // ✅ Broadcast to all clients
      io.emit("incidentDeleted", { incidentId: id, incident });
      
      console.log(`📢 Incident deleted`);
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

module.exports = router;