const mongoose = require("mongoose");

const LearningModuleSchema = new mongoose.Schema({
  moduleId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "", trim: true },
  isActive: { type: Boolean, default: true, index: true },
  displayOrder: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("LearningModule", LearningModuleSchema);
