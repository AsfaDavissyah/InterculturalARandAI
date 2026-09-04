import 'package:flutter/material.dart';

import '../models/ai_response.dart';
import '../models/conversation_latency.dart';
import '../models/scenario_topic.dart';
import 'practice_report_screen.dart';

class ResultScreen extends StatelessWidget {
  final ScenarioTopic scenario;
  final AiResponse finalResponse;
  final List<AiResponse> evaluationResults;
  final List<Map<String, String>> conversationHistory;
  final List<ConversationLatencyTrace> latencyMetrics;

  const ResultScreen({
    super.key,
    required this.scenario,
    required this.finalResponse,
    required this.evaluationResults,
    required this.conversationHistory,
    this.latencyMetrics = const [],
  });

  @override
  Widget build(BuildContext context) {
    return PracticeReportScreen(
      mode: PracticeReportMode.result,
      data: PracticeReportData.fromLive(
        scenario: scenario,
        finalResponse: finalResponse,
        evaluations: evaluationResults,
        conversation: conversationHistory,
      ),
    );
  }
}
