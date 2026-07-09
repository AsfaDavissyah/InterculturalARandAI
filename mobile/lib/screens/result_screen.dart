import 'package:flutter/material.dart';
import '../models/ai_response.dart';

class ResultScreen extends StatelessWidget {
  final AiResponse finalResponse;
  final List<AiResponse> evaluationResults;
  final List<Map<String, String>> conversationHistory;

  const ResultScreen({
    super.key,
    required this.finalResponse,
    required this.evaluationResults,
    required this.conversationHistory,
  });

  double _calculateAverageScore() {
    final scores = finalResponse.scores;

    final total = (scores["grammar"] ?? 0) +
        (scores["vocabulary"] ?? 0) +
        (scores["fluency"] ?? 0) +
        (scores["politeness"] ?? 0) +
        (scores["pragmatic_appropriateness"] ?? 0) +
        (scores["intercultural_awareness"] ?? 0);

    return total / 6;
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

  @override
  Widget build(BuildContext context) {
    final averageScore = _calculateAverageScore();

    return Scaffold(
      appBar: AppBar(
        title: const Text("Final Result"),
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
                    "G-ICC-008",
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    "Welcoming an International Visitor",
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
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
                ],
              ),
            ),

            _sectionTitle("Scores"),
            _scoreItem("Grammar", finalResponse.scores["grammar"]),
            _scoreItem("Vocabulary", finalResponse.scores["vocabulary"]),
            _scoreItem("Fluency", finalResponse.scores["fluency"]),
            _scoreItem("Politeness", finalResponse.scores["politeness"]),
            _scoreItem(
              "Pragmatic Appropriateness",
              finalResponse.scores["pragmatic_appropriateness"],
            ),
            _scoreItem(
              "Intercultural Awareness",
              finalResponse.scores["intercultural_awareness"],
            ),

            _sectionTitle("Feedback"),
            _infoBox(finalResponse.feedback),

            _sectionTitle("Cultural Note"),
            _infoBox(finalResponse.culturalNote),

            _sectionTitle("Improved Response"),
            _infoBox(finalResponse.improvedResponse),

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
                child: const Text("Back to Scenario"),
              ),
            ),
          ],
        ),
      ),
    );
  }
}