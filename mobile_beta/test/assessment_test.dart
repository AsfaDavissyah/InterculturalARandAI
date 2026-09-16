import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_beta/models/assessment.dart';
import 'package:mobile_beta/models/ai_response.dart';

void main() {
  List<Map<String, String>> transcript(int count) => List.generate(
    count,
    (_) => {
      'speaker': 'Student',
      'confirmed': 'true',
      'message': 'Could you please explain this part of my assignment?',
    },
  );
  List<AiResponse> evaluations(
    int count, {
    String source = 'openai',
    bool complete = true,
  }) => List.generate(
    count,
    (i) => AiResponse.fromJson({
      'turn_number': i + 1,
      'source': source,
      'scores': {
        for (final key in [
          'grammar',
          'vocabulary',
          'fluency',
          'politeness',
          'pragmatic_appropriateness',
          'intercultural_awareness',
        ])
          key: 5,
      },
      'completed_objective_ids': ['a', 'b'],
      'session_progress': {
        'remaining_objective_ids': complete ? [] : ['c', 'd', 'e'],
      },
    }),
  );
  test('one turn and incomplete objectives have insufficient evidence', () {
    final result = Assessment.calculate(
      transcript(1),
      evaluations(1, complete: false),
    );
    expect(result.status, 'insufficient_evidence');
    expect(result.overall, isNull);
    expect(result.scores, isEmpty);
    expect(result.totalObjectives, 5);
  });
  test('unconfirmed and duplicate turns do not qualify', () {
    final items = transcript(5)..forEach((item) => item.remove('confirmed'));
    expect(Assessment.calculate(items, evaluations(5)).overall, isNull);
    expect(
      Assessment.calculate(
        transcript(5),
        List.filled(5, evaluations(1).first),
      ).overall,
      isNull,
    );
  });
  test('placeholder and fallback evaluations cannot contribute scores', () {
    for (final source in [
      'openai_chat',
      'local_fast_fallback',
      'local_fallback',
      'rule_based',
    ]) {
      expect(
        Assessment.calculate(
          transcript(5),
          evaluations(5, source: source),
        ).status,
        'evaluation_pending',
      );
    }
  });
  test('complete evidence qualifies while incomplete goals remain partial', () {
    expect(Assessment.calculate(transcript(5), evaluations(5)).overall, 5);
    final partial = Assessment.calculate(
      transcript(5),
      evaluations(5, complete: false),
    );
    expect(partial.status, 'partial');
    expect(partial.scores['grammar'], 5);
    expect(partial.overall, isNull);
  });
}
