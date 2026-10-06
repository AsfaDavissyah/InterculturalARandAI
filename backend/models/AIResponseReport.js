const mongoose = require("mongoose");

const AIResponseReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  sessionId: { type: String, required: true, trim: true, index: true },
  scenarioId: { type: String, default: "", trim: true, index: true },
  turnNumber: { type: Number, required: true, min: 1 },
  responseText: { type: String, required: true, trim: true, maxlength: 3000 },
  category: {
    type: String,
    enum: ["incorrect", "irrelevant", "repeated", "incomplete", "inappropriate", "other"],
    required: true,
    index: true,
  },
  notes: { type: String, default: "", trim: true, maxlength: 1000 },
  status: {
    type: String,
    enum: ["open", "reviewed", "resolved"],
    default: "open",
    index: true,
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
});

AIResponseReportSchema.index(
  { userId: 1, sessionId: 1, turnNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model("AIResponseReport", AIResponseReportSchema);
