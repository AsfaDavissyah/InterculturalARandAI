import 'package:flutter/material.dart';

import '../models/ai_response.dart';
import '../models/scenario_topic.dart';

class ResultScreen extends StatelessWidget {
  final ScenarioTopic scenario;
  final AiResponse finalResponse;
  final List<AiResponse> evaluationResults;
  final List<Map<String, String>> conversationHistory;

  const ResultScreen({
    super.key,
    required this.scenario,
    required this.finalResponse,
    required this.evaluationResults,
    required this.conversationHistory,
  });

  static const Color _cream = Color(0xFFFFFCF4);
  static const Color _black = Color(0xFF000000);
  static const Color _orange = Color(0xFFD4842A);
  static const Color _line = Color(0xFFE8E2D8);

  List<AiResponse> get _results =>
      evaluationResults.isEmpty ? [finalResponse] : evaluationResults;

  double _calculateAverageScore() {
    var total = 0.0;
    for (final result in _results) {
      final scores = result.scores;
      total +=
          (scores["grammar"] ?? 0) +
          (scores["vocabulary"] ?? 0) +
          (scores["fluency"] ?? 0) +
          (scores["politeness"] ?? 0) +
          (scores["pragmatic_appropriateness"] ?? 0) +
          (scores["intercultural_awareness"] ?? 0);
    }
    return total / (_results.length * 6);
  }

  double _averageFor(String key) {
    final total = _results.fold<double>(
      0,
      (sum, result) => sum + ((result.scores[key] as num?)?.toDouble() ?? 0),
    );
    return total / _results.length;
  }

  String _objectiveLabel(String objectiveId) {
    return objectiveId
        .split('_')
        .map(
          (word) => word.isEmpty
              ? word
              : '${word[0].toUpperCase()}${word.substring(1)}',
        )
        .join(' ');
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(top: 22, bottom: 10),
      child: Text(
        title,
        style: const TextStyle(
          color: _black,
          fontSize: 18,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }

  Widget _panel({required Widget child, Color color = _cream}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _line, width: 1.2),
      ),
      child: child,
    );
  }

  Widget _infoBox(String text) {
    return _panel(
      child: Text(
        text.isEmpty ? '-' : text,
        style: const TextStyle(
          color: _black,
          fontSize: 14,
          height: 1.45,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _scoreItem(String label, double value) {
    final clamped = value.clamp(0, 5);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _line),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    color: _black,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Text(
                clamped.toStringAsFixed(1),
                style: const TextStyle(
                  color: _black,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: clamped / 5,
              minHeight: 7,
              backgroundColor: const Color(0xFFF2EBDD),
              valueColor: const AlwaysStoppedAnimation<Color>(_orange),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final averageScore = _calculateAverageScore();
    final progress = finalResponse.sessionProgress;
    final completedObjectives = finalResponse.completedObjectiveIds;
    final remainingObjectives =
        (progress['remaining_objective_ids'] as List<dynamic>? ?? const [])
            .map((item) => item.toString())
            .toList();
    final sessionComplete = progress['session_complete'] == true;
    final totalObjectives =
        completedObjectives.length + remainingObjectives.length;

    return Scaffold(
      backgroundColor: _cream,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: _cream,
        foregroundColor: _black,
        title: const Text(
          'Practice Result',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: _orange,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: _orange.withValues(alpha: 0.22),
                      blurRadius: 24,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        scenario.id,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      scenario.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          averageScore.toStringAsFixed(1),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 56,
                            fontWeight: FontWeight.w900,
                            height: 0.95,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Padding(
                          padding: EdgeInsets.only(bottom: 7),
                          child: Text(
                            '/ 5',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(
                      '${sessionComplete ? 'Completed' : 'Ended manually'} - ${evaluationResults.length} student responses',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.88),
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),

              _sectionTitle('Task Progress'),
              _infoBox(
                [
                  'Completed goals: ${completedObjectives.length}/$totalObjectives',
                  if (completedObjectives.isNotEmpty)
                    'Achieved: ${completedObjectives.map(_objectiveLabel).join(', ')}',
                  if (remainingObjectives.isNotEmpty)
                    'Remaining: ${remainingObjectives.map(_objectiveLabel).join(', ')}',
                ].join('\n'),
              ),

              _sectionTitle('Scores'),
              _scoreItem('Grammar', _averageFor('grammar')),
              _scoreItem('Vocabulary', _averageFor('vocabulary')),
              _scoreItem('Fluency', _averageFor('fluency')),
              _scoreItem('Politeness', _averageFor('politeness')),
              _scoreItem(
                'Pragmatic Appropriateness',
                _averageFor('pragmatic_appropriateness'),
              ),
              _scoreItem(
                'Intercultural Awareness',
                _averageFor('intercultural_awareness'),
              ),

              _sectionTitle('Feedback'),
              _infoBox(finalResponse.feedback),

              _sectionTitle('Cultural Note'),
              _infoBox(finalResponse.culturalNote),

              _sectionTitle('Improved Response'),
              _infoBox(finalResponse.improvedResponse),

              if (evaluationResults.length > 1) ...[
                _sectionTitle('Turn Feedback'),
                ...evaluationResults.asMap().entries.map((entry) {
                  final result = entry.value;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _panel(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Response ${entry.key + 1}: ${result.detectedCategory}',
                            style: const TextStyle(
                              color: _black,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            result.feedback,
                            style: const TextStyle(color: _black, height: 1.42),
                          ),
                          if (result.improvedResponse.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            Text(
                              'Try: ${result.improvedResponse}',
                              style: const TextStyle(
                                color: _black,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                }),
              ],

              _sectionTitle('Conversation History'),
              ...conversationHistory.map((item) {
                final speaker = item['speaker'] ?? '';
                final message = item['message'] ?? '';
                final isStudent = speaker == 'Student';

                return Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isStudent ? Colors.white : const Color(0xFFFFF4E3),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: _line),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        speaker,
                        style: TextStyle(
                          color: _black.withValues(alpha: 0.55),
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        message,
                        style: const TextStyle(
                          color: _black,
                          height: 1.4,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                );
              }),

              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 54,
                child: FilledButton(
                  onPressed: () {
                    Navigator.popUntil(context, (route) => route.isFirst);
                  },
                  style: FilledButton.styleFrom(
                    backgroundColor: _black,
                    foregroundColor: _cream,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(27),
                    ),
                  ),
                  child: const Text(
                    'Back to Topics',
                    style: TextStyle(fontWeight: FontWeight.w900),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
