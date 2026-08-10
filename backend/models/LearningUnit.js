const mongoose = require("mongoose");

const LearningUnitSchema = new mongoose.Schema({
  unitId: {
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
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "", trim: true },
  isActive: { type: Boolean, default: true, index: true },
  displayOrder: { type: Number, default: 0 },
}, { timestamps: true });

LearningUnitSchema.index({ moduleId: 1, displayOrder: 1 });

module.exports = mongoose.model("LearningUnit", LearningUnitSchema);
