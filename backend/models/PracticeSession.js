const mongoose = require("mongoose");

const TranscriptItemSchema = new mongoose.Schema({
  speaker: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const ScoreBreakdownSchema = new mongoose.Schema({
  appropriateness: { type: Number, default: 0 },
  politeness: { type: Number, default: 0 },
  grammar: { type: Number, default: 0 },
  cultural_sensitivity: { type: Number, default: 0 },
});

const PracticeSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  scenario: {
    scenario_id: { type: String, required: true },
    title: { type: String, required: true },
    scenario_type: { type: String },
    level: { type: String },
    ar_scene: { type: String },
    student_role: { type: String },
    ai_role: { type: String },
    task_instruction: { type: String },
  },
  transcript: [TranscriptItemSchema],
  overallScore: {
    type: Number,
    required: true,
  },
  averageScores: ScoreBreakdownSchema,
  status: {
    type: String,
    enum: ["completed", "active", "abandoned"],
    default: "completed",
  },
  durationSeconds: {
    type: Number,
    default: 0,
  },
  studentResponseCount: {
    type: Number,
    default: 0,
  },
  completedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("PracticeSession", PracticeSessionSchema);
