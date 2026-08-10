const mongoose = require("mongoose");

const LaunchTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true, index: true },
  tokenPrefix: { type: String, required: true, trim: true },
  moduleId: { type: String, required: true, uppercase: true, trim: true, index: true },
  unitId: { type: String, required: true, uppercase: true, trim: true, index: true },
  pageId: { type: String, required: true, uppercase: true, trim: true, index: true },
  settingId: { type: String, required: true, uppercase: true, trim: true, index: true },
  expiresAt: { type: Date, required: true, index: true },
  isActive: { type: Boolean, default: true, index: true },
  scanCount: { type: Number, default: 0 },
  lastScannedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("LaunchToken", LaunchTokenSchema);
