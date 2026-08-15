const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizePracticeSessionPayload,
  serializePracticeSession,
  serializeLecturerSession,
} = require("../server");

const pilotMetadata = {
  captured_at: "2026-08-15T08:05:00.000Z",
  device_label: "Samsung A52",
  platform: "android",
  os_version: "Android 14",
  viewport_width: 393,
  viewport_height: 873,
  pixel_ratio: 2.75,
  network_profile: "approved_wifi",
  install_type: "fresh_install",
  app_build: "1.0.0+11",
};

test("Phase 11 session normalization preserves pilot and QR attribution", () => {
  const normalized = normalizePracticeSessionPayload({
    session_id: "phase11-session-001",
    scenario: { scenario_id: "ACADEMIC-LECTURER-OFFICE", title: "Lecturer Office" },
    overall_score: 4.2,
    experience_type: "guided_topic",
    topic_id: "academic-communication",
    setting_id: "ACADEMIC-LECTURER-OFFICE",
    launch_source: "module_qr",
    module_id: "ICC-PILOT-01",
    unit_id: "UNIT-ACADEMIC-01",
    page_id: "PAGE-LECTURER-OFFICE-01",
    latency_summary: { sample_count: 6, median_first_audio_ms: 1700 },
    pilot_metadata: pilotMetadata,
  }, "507f1f77bcf86cd799439011");

  assert.equal(normalized.moduleId, "ICC-PILOT-01");
  assert.equal(normalized.pilotMetadata.device_label, "Samsung A52");
  assert.equal(normalized.latencySummary.sample_count, 6);
});

test("Phase 11 history serializer is schema v3 and backward compatible", () => {
  const serialized = serializePracticeSession({
    sessionId: "phase11-session-002",
    scenario: { scenario_id: "G-ICC-008", title: "Archived Scenario Snapshot" },
    overallScore: 4,
    completedAt: new Date("2026-08-15T08:05:00.000Z"),
  });

  assert.equal(serialized.schema_version, 3);
  assert.equal(serialized.scenario.title, "Archived Scenario Snapshot");
  assert.equal(serialized.pilot_metadata, null);
});

test("Phase 11 lecturer serializer exposes complete research evidence", () => {
  const serialized = serializeLecturerSession({
    sessionId: "phase11-session-003",
    student: { student_id: "STU-001", display_name: "Pilot Student" },
    scenario: { scenario_id: "SOCIAL-MELBOURNE-CAFE", title: "Melbourne Cafe" },
    experienceType: "guided_topic",
    topicId: "social-communication",
    settingId: "SOCIAL-MELBOURNE-CAFE",
    launchSource: "module_qr",
    moduleId: "ICC-PILOT-01",
    unitId: "UNIT-SOCIAL-01",
    pageId: "PAGE-CAFE-01",
    latencySummary: { sample_count: 7, median_first_audio_ms: 1600, p95_first_audio_ms: 2400 },
    pilotMetadata,
    overallScore: 4.4,
    completedAt: new Date("2026-08-15T08:05:00.000Z"),
  });

  assert.equal(serialized.scenario.title, "Melbourne Cafe");
  assert.equal(serialized.module_id, "ICC-PILOT-01");
  assert.equal(serialized.latency_summary.p95_first_audio_ms, 2400);
  assert.equal(serialized.pilot_metadata.install_type, "fresh_install");
});
