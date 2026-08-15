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
  experienceType: {
    type: String,
    enum: ["legacy_scenario", "guided_topic"],
    default: "legacy_scenario",
  },
  topicId: {
    type: String,
    trim: true,
  },
  topicTitle: {
    type: String,
    trim: true,
  },
  settingId: {
    type: String,
    trim: true,
  },
  settingTitle: {
    type: String,
    trim: true,
  },
  avatarKey: {
    type: String,
    trim: true,
  },
  launchSource: {
    type: String,
    enum: ["browse", "module_qr", "legacy"],
    default: "legacy",
  },
  moduleId: {
    type: String,
    trim: true,
  },
  unitId: {
    type: String,
    trim: true,
  },
  pageId: {
    type: String,
    trim: true,
  },
  coachingEvents: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  latencyMetrics: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  latencySummary: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  pilotMetadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
});

module.exports = mongoose.model("PracticeSession", PracticeSessionSchema);
