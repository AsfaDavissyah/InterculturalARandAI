const mongoose = require("mongoose");

const AIPartnerSchema = new mongoose.Schema(
  {
    profile_id: { type: String, trim: true, default: "emma-lecturer" },
    display_name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    culture: { type: String, default: "", trim: true },
    avatar_key: { type: String, default: "", trim: true },
    voice_profile: { type: String, default: "female", trim: true },
  },
  { _id: false }
);

const OwnerSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["admin", "lecturer"], default: "admin" },
    user_id: { type: mongoose.Schema.Types.Mixed, default: null },
    display_name: { type: String, default: "System Admin", trim: true },
  },
  { _id: false }
);

const SessionRulesSchema = new mongoose.Schema(
  {
    target_duration_minutes: { type: Number, default: 5 },
    minimum_student_responses: { type: Number, default: 5 },
    target_student_responses_min: { type: Number, default: 6 },
    target_student_responses_max: { type: Number, default: 8 },
    maximum_student_responses: { type: Number, default: 10 },
  },
  { _id: false }
);

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
  briefing: {
    type: String,
    trim: true,
    default: "",
  },
  placements: {
    type: [String],
    enum: ["guided_topics", "scenario_library"],
    default: ["scenario_library"],
    index: true,
  },
  categoryIds: {
    type: [String],
    default: [],
    index: true,
  },
  status: {
    type: String,
    enum: ["draft", "in_review", "published", "inactive", "archived"],
    default: "published",
    index: true,
  },
  owner: {
    type: OwnerSchema,
    default: () => ({ type: "admin", user_id: null, display_name: "System Admin" }),
  },
  studentRole: {
    type: String,
    trim: true,
    default: "Student",
  },
  aiPartner: {
    type: AIPartnerSchema,
    default: null,
  },
  studentTask: {
    type: String,
    trim: true,
    default: "",
  },
  practiceLocation: {
    type: String,
    trim: true,
    default: "Campus",
  },
  level: {
    type: String,
    trim: true,
    default: "B1",
  },
  visual: {
    sticker_asset_key: { type: String, trim: true, default: "" },
  },
  sessionRules: {
    type: SessionRulesSchema,
    default: () => ({}),
  },
  advanced: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
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
  legacyRefs: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  archivedAt: {
    type: Date,
    default: null,
  },
  review: {
    submittedAt: { type: Date, default: null },
    submittedBy: { type: mongoose.Schema.Types.Mixed, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.Mixed, default: null },
    decision: {
      type: String,
      enum: ["pending", "approved", "changes_requested", null],
      default: null,
    },
    comment: { type: String, trim: true, default: "" },
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

// Keep status and isActive synchronized
ScenarioSchema.pre("save", function () {
  this.updatedAt = new Date();
  if (this.isModified("status")) {
    this.isActive = this.status === "published";
  } else if (this.isModified("isActive") && !this.isModified("status")) {
    this.status = this.isActive ? "published" : "inactive";
  }
});

module.exports = mongoose.model("Scenario", ScenarioSchema);
