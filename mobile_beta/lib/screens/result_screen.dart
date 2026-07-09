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

  double _calculateAverageScore() {
    final results = evaluationResults.isEmpty
        ? [finalResponse]
        : evaluationResults;
    var total = 0.0;

    for (final result in results) {
      final scores = result.scores;
      total +=
          (scores["grammar"] ?? 0) +
          (scores["vocabulary"] ?? 0) +
          (scores["fluency"] ?? 0) +
          (scores["politeness"] ?? 0) +
          (scores["pragmatic_appropriateness"] ?? 0) +
          (scores["intercultural_awareness"] ?? 0);
    }

    return total / (results.length * 6);
  }

  double _averageFor(String key) {
    final results = evaluationResults.isEmpty
        ? [finalResponse]
        : evaluationResults;
    final total = results.fold<double>(
      0,
      (sum, result) => sum + ((result.scores[key] as num?)?.toDouble() ?? 0),
    );
    return total / results.length;
  }

  Widget _scoreItem(String label, dynamic value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.shade100),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(
            value.toString(),
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(top: 18, bottom: 8),
      child: Text(
        title,
        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _infoBox(String text) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Text(text),
    );
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

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text("Practice Result"),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "Scenario",
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "${scenario.id} - ${scenario.title}",
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    "Average Score: ${averageScore.toStringAsFixed(1)} / 5",
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text("Final Category: ${finalResponse.detectedCategory}"),
                  const SizedBox(height: 4),
                  Text("Student responses: ${evaluationResults.length}"),
                  const SizedBox(height: 4),
                  Text(
                    "Task status: ${sessionComplete ? 'Completed' : 'Ended manually'}",
                  ),
                ],
              ),
            ),

            _sectionTitle("Task Progress"),
            _infoBox(
              [
                "Completed goals: ${completedObjectives.length}/${completedObjectives.length + remainingObjectives.length}",
                if (completedObjectives.isNotEmpty)
                  "Achieved: ${completedObjectives.map(_objectiveLabel).join(', ')}",
                if (remainingObjectives.isNotEmpty)
                  "Remaining: ${remainingObjectives.map(_objectiveLabel).join(', ')}",
              ].join('\n'),
            ),

            _sectionTitle("Scores"),
            _scoreItem("Grammar", _averageFor("grammar").toStringAsFixed(1)),
            _scoreItem(
              "Vocabulary",
              _averageFor("vocabulary").toStringAsFixed(1),
            ),
            _scoreItem("Fluency", _averageFor("fluency").toStringAsFixed(1)),
            _scoreItem(
              "Politeness",
              _averageFor("politeness").toStringAsFixed(1),
            ),
            _scoreItem(
              "Pragmatic Appropriateness",
              _averageFor("pragmatic_appropriateness").toStringAsFixed(1),
            ),
            _scoreItem(
              "Intercultural Awareness",
              _averageFor("intercultural_awareness").toStringAsFixed(1),
            ),

            _sectionTitle("Feedback"),
            _infoBox(finalResponse.feedback),

            _sectionTitle("Cultural Note"),
            _infoBox(finalResponse.culturalNote),

            _sectionTitle("Improved Response"),
            _infoBox(finalResponse.improvedResponse),

            if (evaluationResults.length > 1) ...[
              _sectionTitle("Turn Feedback"),
              ...evaluationResults.asMap().entries.map((entry) {
                final result = entry.value;
                return Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Response ${entry.key + 1}: ${result.detectedCategory}",
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 5),
                      Text(result.feedback),
                      if (result.improvedResponse.isNotEmpty) ...[
                        const SizedBox(height: 7),
                        Text("Try: ${result.improvedResponse}"),
                      ],
                    ],
                  ),
                );
              }),
            ],

            _sectionTitle("Conversation History"),
            ...conversationHistory.map((item) {
              final speaker = item["speaker"] ?? "";
              final message = item["message"] ?? "";

              return Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: speaker == "Student"
                      ? Colors.green.shade50
                      : Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      speaker,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(message),
                  ],
                ),
              );
            }),

            const SizedBox(height: 20),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.popUntil(context, (route) => route.isFirst);
                },
                child: const Text("Back to Topics"),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
