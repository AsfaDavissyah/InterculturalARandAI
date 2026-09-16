const SCORE_KEYS = ["grammar", "vocabulary", "fluency", "politeness", "pragmatic_appropriateness", "intercultural_awareness"];
const MIN_TURNS = 5;
const MIN_WORDS = 30;

function assessSession(session) {
  const turns = (session.transcript || []).filter(item => /^(student|user)$/i.test(item.speaker));
  const evaluations = new Map();
  for (const item of session.evaluations || []) {
    if (item.source === "openai" && Number.isInteger(item.turn_number) && item.turn_number > 0) {
      evaluations.set(item.turn_number, item);
    }
  }
  const confirmed = turns.map((item, index) => ({ item, index }))
    .filter(({ item }) => item.confirmed === true || item.confirmed === "true");
  const words = confirmed.reduce((sum, { item }) => sum + (String(item.message || "").match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || []).length, 0);
  const meaningful = confirmed.filter(({ item }) => (String(item.message || "").match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || []).length >= 3);
  const scores = {};
  const enough = meaningful.length >= MIN_TURNS && words >= MIN_WORDS;
  if (enough) {
    for (const key of SCORE_KEYS) {
      const values = meaningful.map(({ index }) => evaluations.get(index + 1)?.scores?.[key])
        .filter(value => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 5);
      if (values.length >= MIN_TURNS) scores[key] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }
  const latest = [...(session.evaluations || [])].sort((a, b) => b.turn_number - a.turn_number)[0];
  const progress = latest?.session_progress || {};
  const completed = new Set(latest?.completed_objective_ids || []);
  const remaining = progress.remaining_objective_ids;
  const total = completed.size + (Array.isArray(remaining) ? remaining.length : 0);
  const objectivesComplete = total > 0 && Array.isArray(remaining) && remaining.length === 0;
  const status = !enough ? "insufficient_evidence" : Object.keys(scores).length < SCORE_KEYS.length ? "evaluation_pending" : !objectivesComplete ? "partial" : "assessed";
  return {
    policy_version: 1, status, minimum_turns: MIN_TURNS, minimum_words: MIN_WORDS,
    confirmed_turns: meaningful.length, confirmed_words: words,
    completed_objectives: completed.size, total_objectives: total,
    objective_coverage: total ? completed.size / total : null,
    scores,
    overall_score: status === "assessed" ? Object.values(scores).reduce((a, b) => a + b, 0) / SCORE_KEYS.length : null,
  };
}

function assessmentFields(session) {
  const assessment = assessSession(session);
  return { assessment, overall_score: assessment.overall_score, average_scores: assessment.scores, score_breakdown: assessment.scores };
}

function averageAssessedScore(sessions) {
  const values = sessions.map(session => assessSession(session).overall_score).filter(value => value !== null);
  return values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : null;
}
module.exports = { assessSession, assessmentFields, averageAssessedScore, SCORE_KEYS, MIN_TURNS, MIN_WORDS };
