const mongoose = require("mongoose");

const LearningPageSchema = new mongoose.Schema({
  pageId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  moduleId: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  unitId: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  title: { type: String, required: true, trim: true },
  instructions: { type: String, default: "", trim: true },
  settingId: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  isActive: { type: Boolean, default: true, index: true },
  displayOrder: { type: Number, default: 0 },
}, { timestamps: true });

LearningPageSchema.index({ moduleId: 1, unitId: 1, displayOrder: 1 });

module.exports = mongoose.model("LearningPage", LearningPageSchema);
