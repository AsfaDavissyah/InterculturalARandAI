const test = require("node:test");
const assert = require("node:assert/strict");
const {
  deriveDurationSeconds,
  deriveStudentResponseCount,
} = require("../services/practice_metrics_service");

test("uses recorded duration and response count when available", () => {
  const session = { durationSeconds: 95.8, studentResponseCount: 7 };

  assert.equal(deriveDurationSeconds(session), 95);
  assert.equal(deriveStudentResponseCount(session), 7);
});

test("derives duration from session timestamps", () => {
  const session = {
    startedAt: "2026-09-05T10:00:00.000Z",
    completedAt: "2026-09-05T10:02:14.900Z",
  };

  assert.equal(deriveDurationSeconds(session), 134);
});

test("derives duration from transcript timestamps when session timestamps are unusable", () => {
  const session = {
    durationSeconds: 0,
    startedAt: "2026-09-05T10:00:00.000Z",
    completedAt: "2026-09-05T10:00:00.000Z",
    transcript: [
      { timestamp: "2026-09-05T10:00:05.000Z" },
      { timestamp: "2026-09-05T10:00:47.400Z" },
    ],
  };

  assert.equal(deriveDurationSeconds(session), 42);
});

test("returns null when a meaningful duration was not recorded", () => {
  const timestamp = "2026-07-13T05:39:46.128Z";
  const session = {
    durationSeconds: 0,
    startedAt: timestamp,
    completedAt: timestamp,
    transcript: [{ timestamp }, { timestamp }],
  };

  assert.equal(deriveDurationSeconds(session), null);
});

test("derives turns from evaluations before falling back to transcript speakers", () => {
  assert.equal(
    deriveStudentResponseCount({
      studentResponseCount: 0,
      evaluations: [{}, {}, {}],
      transcript: [{ speaker: "Student" }],
    }),
    3
  );

  assert.equal(
    deriveStudentResponseCount({
      transcript: [
        { speaker: "Student" },
        { speaker: "AI" },
        { sender: "user" },
        { speaker: "learner" },
      ],
    }),
    3
  );
});
