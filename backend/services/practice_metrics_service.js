function toPositiveWholeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : null;
}

function toTimestamp(value) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function deriveDurationSeconds(session = {}) {
  const storedDuration = toPositiveWholeNumber(
    session.durationSeconds ?? session.duration_seconds
  );
  if (storedDuration !== null) return storedDuration;

  const startedAt = toTimestamp(session.startedAt ?? session.started_at);
  const completedAt = toTimestamp(session.completedAt ?? session.completed_at);
  if (startedAt !== null && completedAt !== null) {
    const elapsed = toPositiveWholeNumber((completedAt - startedAt) / 1000);
    if (elapsed !== null) return elapsed;
  }

  const transcriptTimestamps = Array.isArray(session.transcript)
    ? session.transcript
        .map((item) => toTimestamp(item?.timestamp ?? item?.created_at))
        .filter((timestamp) => timestamp !== null)
    : [];

  if (transcriptTimestamps.length >= 2) {
    const elapsed = toPositiveWholeNumber(
      (Math.max(...transcriptTimestamps) - Math.min(...transcriptTimestamps)) / 1000
    );
    if (elapsed !== null) return elapsed;
  }

  return null;
}

function deriveStudentResponseCount(session = {}) {
  const storedCount = toPositiveWholeNumber(
    session.studentResponseCount ?? session.student_response_count
  );
  if (storedCount !== null) return storedCount;

  if (Array.isArray(session.evaluations) && session.evaluations.length > 0) {
    return session.evaluations.length;
  }

  if (!Array.isArray(session.transcript)) return 0;

  const studentSpeakers = new Set(["student", "user", "learner"]);
  return session.transcript.filter((item) => {
    const speaker = String(item?.speaker ?? item?.sender ?? "").trim().toLowerCase();
    return studentSpeakers.has(speaker);
  }).length;
}

module.exports = {
  deriveDurationSeconds,
  deriveStudentResponseCount,
};
