const mongoose = require("mongoose");

const AuditEventSchema = new mongoose.Schema({
  event: { type: String, required: true, index: true },
  actorId: { type: mongoose.Schema.Types.Mixed, default: null, index: true },
  role: { type: String, default: "system", index: true },
  recordId: { type: String, default: null, index: true },
  requestId: { type: String, default: null },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model("AuditEvent", AuditEventSchema);
