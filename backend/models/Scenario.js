const mongoose = require("mongoose");

const ScenarioSchema = new mongoose.Schema({
  scenarioId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  version: {
    type: Number,
    default: 1,
    min: 1,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Keep updatedAt compatible with modern Mongoose middleware.
ScenarioSchema.pre("save", function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model("Scenario", ScenarioSchema);
