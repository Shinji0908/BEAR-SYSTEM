const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  contact: { type: String, unique: true, sparse: true }, // unique but allow null values
  birthday: { type: Date },

  password: { type: String, required: true }, // 🔒 Hashed with bcrypt

  // ✅ User roles
  role: {
    type: String,
    enum: ["Resident", "Responder", "Admin"],
    default: "Resident",
  },

  // ✅ If Responder, specify type
  responderType: {
    type: String,
    enum: ["police", "fire", "hospital", "barangay"],
    default: null,
  },

  // ✅ Verification System
  verificationStatus: {
    type: String,
    enum: ["Pending", "Verified", "Approved", "Rejected"],
    default: "Pending",
  },
  verificationDocuments: [{
    type: { type: String }, // File path or URL
    description: String,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    originalName: String,
    fileSize: Number,
    mimetype: String
  }],
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Admin who verified
    default: null,
  },
  verifiedAt: {
    type: Date,
    default: null,
  },
  rejectionReason: {
    type: String,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", UserSchema);
