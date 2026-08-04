const mongoose = require("mongoose");

const AICharacterSchema = new mongoose.Schema(
  {
    display_name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    culture: { type: String, default: "", trim: true },
    avatar_key: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const SettingSchema = new mongoose.Schema({
  settingId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  topicId: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  briefing: {
    type: String,
    trim: true,
    default: "",
  },
  stickerAssetKey: {
    type: String,
    trim: true,
    default: "",
  },
  studentRole: {
    type: String,
    required: true,
    trim: true,
  },
  aiCharacter: {
    type: AICharacterSchema,
    required: true,
  },
  taskInstruction: {
    type: String,
    trim: true,
    default: "",
  },
  conversationStages: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  constraints: {
    type: [String],
    default: [],
  },
  rubric: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  sessionRules: {
    minimumStudentResponses: { type: Number, default: 5 },
    targetStudentResponsesMin: { type: Number, default: 6 },
    targetStudentResponsesMax: { type: Number, default: 8 },
    maximumStudentResponses: { type: Number, default: 10 },
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  version: {
    type: Number,
    default: 1,
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

SettingSchema.pre("save", function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model("Setting", SettingSchema);
