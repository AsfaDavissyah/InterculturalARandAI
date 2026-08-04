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
    default: "",
  },
  displayOrder: {
    type: Number,
    default: 0,
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
});

module.exports = mongoose.model("Topic", TopicSchema);
