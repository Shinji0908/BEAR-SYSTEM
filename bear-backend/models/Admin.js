const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["Admin", "admin"], default: "Admin" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Admin", AdminSchema);


