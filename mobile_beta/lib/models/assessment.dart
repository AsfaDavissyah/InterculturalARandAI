import 'ai_response.dart';

class Assessment {
  final String status;
  final Map<String, double> scores;
  final double? overall;
  final int completedObjectives;
  final int totalObjectives;
  const Assessment(
    this.status,
    this.scores,
    this.overall,
    this.completedObjectives,
    this.totalObjectives,
  );
  String get label => switch (status) {
    'assessed' => 'Assessed',
    'partial' => 'Partial assessment',
    'evaluation_pending' => 'Evaluation pending',
    _ => 'Insufficient evidence',
  };
  static Assessment calculate(
    List<Map<String, String>> transcript,
    List<AiResponse> evaluations,
  ) {
    const keys = [
      'grammar',
      'vocabulary',
      'fluency',
      'politeness',
      'pragmatic_appropriateness',
      'intercultural_awareness',
    ];
    final turns = transcript
        .where(
          (item) =>
              ['student', 'user'].contains(item['speaker']?.toLowerCase()),
        )
        .toList();
    final wordPattern = RegExp(r"[A-Za-z]+(?:'[A-Za-z]+)?");
    final indices = <int>[];
    var words = 0;
    for (var i = 0; i < turns.length; i++) {
      if (turns[i]['confirmed'] != 'true') continue;
      final count = wordPattern.allMatches(turns[i]['message'] ?? '').length;
      words += count;
      if (count >= 3) indices.add(i + 1);
    }
    final verified = {
      for (final evaluation in evaluations)
        if (evaluation.source == 'openai') evaluation.turnNumber: evaluation,
    };
    final scores = <String, double>{};
    final enough = indices.length >= 5 && words >= 30;
    if (enough) {
      for (final key in keys) {
        final values = indices
            .map((index) => verified[index]?.scores[key])
            .whereType<num>()
            .where((value) => value.isFinite && value >= 0 && value <= 5)
            .toList();
        if (values.length >= 5) {
          scores[key] =
              values.fold<double>(0, (sum, value) => sum + value) /
              values.length;
        }
      }
    }
    final sorted = [...evaluations]
      ..sort((a, b) => b.turnNumber.compareTo(a.turnNumber));
    final latest = sorted.isEmpty ? null : sorted.first;
    final completed = latest?.completedObjectiveIds.toSet().length ?? 0;
    final remaining = latest?.sessionProgress['remaining_objective_ids'];
    final total = completed + (remaining is List ? remaining.length : 0);
    final objectivesComplete =
        total > 0 && remaining is List && remaining.isEmpty;
    final status = !enough
        ? 'insufficient_evidence'
        : scores.length < keys.length
        ? 'evaluation_pending'
        : !objectivesComplete
        ? 'partial'
        : 'assessed';
    return Assessment(
      status,
      scores,
      status == 'assessed'
          ? scores.values.reduce((a, b) => a + b) / keys.length
          : null,
      completed,
      total,
    );
  }
}
