const mongoose = require("mongoose");

const AccountDeletionRequestSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true, index: true },
  studentId: { type: String, default: "", trim: true },
  notes: { type: String, default: "", trim: true, maxlength: 1000 },
  status: {
    type: String,
    enum: ["pending_verification", "verified", "completed", "rejected"],
    default: "pending_verification",
    index: true,
  },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  handledAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model("AccountDeletionRequest", AccountDeletionRequestSchema);
