const mongoose = require("mongoose");

const TopicSchema = new mongoose.Schema({
  topicId: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: "",
  },
  iconKey: {
    type: String,
    trim: true,
    default: "book",
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["active", "archived"],
    default: "active",
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  languageObjectives: {
    type: [String],
    default: [],
  },
  iccObjectives: {
    type: [String],
    default: [],
  },
  archivedAt: {
    type: Date,
    default: null,
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

TopicSchema.pre("save", function () {
  this.updatedAt = new Date();
  if (this.isModified("status")) {
    this.isActive = this.status === "active";
  } else if (this.isModified("isActive") && !this.isModified("status")) {
    this.status = this.isActive ? "active" : "archived";
  }
});

module.exports = mongoose.model("Topic", TopicSchema);
