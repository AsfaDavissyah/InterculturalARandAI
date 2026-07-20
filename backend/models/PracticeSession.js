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
  grammar: { type: Number, default: 0 },
  vocabulary: { type: Number, default: 0 },
  fluency: { type: Number, default: 0 },
  politeness: { type: Number, default: 0 },
  pragmatic_appropriateness: { type: Number, default: 0 },
  intercultural_awareness: { type: Number, default: 0 },
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
    scenario_version: { type: Number, default: 1 },
    level: { type: String },
    ar_scene: { type: String },
    student_role: { type: String },
    ai_role: { type: String },
    task_instruction: { type: String },
  },
  student: {
    student_id: { type: String },
    display_name: { type: String },
  },
  transcript: [TranscriptItemSchema],
  overallScore: {
    type: Number,
    required: true,
  },
  averageScores: ScoreBreakdownSchema,
  status: {
    type: String,
    enum: ["completed", "active", "abandoned", "ended_manually"],
    default: "completed",
  },
  endReason: {
    type: String,
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
  startedAt: {
    type: Date,
  },
  evaluations: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  completedObjectiveIds: {
    type: [String],
    default: [],
  },
});

module.exports = mongoose.model("PracticeSession", PracticeSessionSchema);
