const mongoose = require("mongoose");

const AudioCacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  contentType: { type: String, default: "audio/mpeg" },
  data: { type: Buffer, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, expires: 0 },
});

module.exports = mongoose.model("AudioCache", AudioCacheSchema);
