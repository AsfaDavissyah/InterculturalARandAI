const assert = require('node:assert/strict');
const test = require('node:test');
const { assessSession, averageAssessedScore, SCORE_KEYS } = require('../services/assessment_service');
function session(count = 5, source = 'openai', complete = true) {
  return {
    status: 'ended_manually',
    transcript: Array.from({ length: count }, () => ({ speaker: 'Student', confirmed: true, message: 'Could you please explain this part of my assignment?' })),
    evaluations: Array.from({ length: count }, (_, i) => ({ turn_number: i + 1, source, scores: Object.fromEntries(SCORE_KEYS.map(key => [key, 5])), completed_objective_ids: ['a', 'b'], session_progress: { remaining_objective_ids: complete ? [] : ['c', 'd', 'e'] } })),
  };
}
test('one turn and two of five goals cannot produce a perfect assessment', () => {
  const result = assessSession(session(1, 'openai', false));
  assert.equal(result.status, 'insufficient_evidence');
  assert.equal(result.overall_score, null);
  assert.deepEqual(result.scores, {});
  assert.equal(result.objective_coverage, 0.4);
});
test('unconfirmed and legacy utterances provide no evidence', () => {
  const data = session();
  data.transcript.forEach(item => delete item.confirmed);
  assert.equal(assessSession(data).confirmed_turns, 0);
  assert.equal(assessSession(data).overall_score, null);
});
test('chat placeholders, fallback and duplicate evaluations cannot manufacture evidence', () => {
  for (const source of ['openai_chat', 'local_fast_fallback', 'local_fallback', 'rule_based']) {
    assert.equal(assessSession(session(5, source)).status, 'evaluation_pending');
  }
  const data = session();
  data.evaluations = Array(5).fill(data.evaluations[0]);
  assert.equal(assessSession(data).overall_score, null);
});
test('manual termination is not a score penalty, incomplete objectives are separate', () => {
  assert.equal(assessSession(session()).overall_score, 5);
  const partial = assessSession(session(5, 'openai', false));
  assert.equal(partial.status, 'partial');
  assert.equal(partial.scores.grammar, 5);
  assert.equal(partial.overall_score, null);
});
test('short utterances, missing and invalid rubric values are not fabricated as zero', () => {
  const data = session();
  data.transcript.forEach(item => item.message = 'Yes please');
  assert.equal(assessSession(data).status, 'insufficient_evidence');
  const missing = session();
  delete missing.evaluations[0].scores.grammar;
  assert.equal(assessSession(missing).scores.grammar, undefined);
  missing.evaluations[0].scores.grammar = 6;
  assert.equal(assessSession(missing).overall_score, null);
});
test('cohort mean excludes insufficient and pending sessions instead of scoring them zero', () => {
  assert.equal(averageAssessedScore([session(), session(1), session(5, 'openai_chat')]), 5);
  assert.equal(averageAssessedScore([session(1)]), null);
});
