const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Incident",
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000 // Limit message length
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for efficient querying by incidentId and timestamp
MessageSchema.index({ incidentId: 1, timestamp: 1 });

module.exports = mongoose.model("Message", MessageSchema);
