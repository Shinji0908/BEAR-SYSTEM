const mongoose = require("mongoose");

const IncidentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  contact: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false, // Optional field
  },
  // High-level emergency category (limited to LGU responders)
  type: {
    type: String,
    enum: ["barangay", "fire", "hospital", "police", "earthquake", "flood"],
    default: "barangay",
  },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Resolved"],
    default: "Pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Incident", IncidentSchema);