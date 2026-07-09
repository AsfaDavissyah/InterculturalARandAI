import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/ai_response.dart';
import '../models/scenario_topic.dart';

class ChatService {
  final String baseUrl;

  const ChatService({required this.baseUrl});

  String _scenarioPath(String scenarioId) {
    return scenarioId.toLowerCase();
  }

  Future<void> checkConnection() async {
    final response = await http
        .get(Uri.parse(baseUrl))
        .timeout(const Duration(seconds: 5));
    if (response.statusCode != 200) {
      throw Exception('Backend returned ${response.statusCode}.');
    }
  }

  Future<List<ScenarioTopic>> getScenarios() async {
    final response = await http
        .get(Uri.parse('$baseUrl/api/scenarios'))
        .timeout(const Duration(seconds: 8));
    if (response.statusCode != 200) {
      throw Exception('Failed to load scenarios: ${response.body}');
    }

    final data = jsonDecode(response.body) as List<dynamic>;
    return data
        .map((item) => ScenarioTopic.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<Map<String, dynamic>> getScenario(String scenarioId) async {
    final url = Uri.parse(
      "$baseUrl/api/scenarios/${_scenarioPath(scenarioId)}",
    );

    final response = await http.get(url).timeout(const Duration(seconds: 10));

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception("Failed to load scenario: ${response.body}");
    }
  }

  Future<AiResponse> evaluateTurn({
    required String sessionId,
    required String scenarioId,
    required int studentResponseCount,
    required List<Map<String, String>> conversationHistory,
    required String studentResponse,
  }) async {
    final url = Uri.parse("$baseUrl/api/chat/evaluate-turn");

    final response = await http
        .post(
          url,
          headers: {"Content-Type": "application/json"},
          body: jsonEncode({
            "session_id": sessionId,
            "scenario_id": scenarioId,
            "student_response_count": studentResponseCount,
            "conversation_history": conversationHistory,
            "student_response": studentResponse,
          }),
        )
        .timeout(const Duration(seconds: 35));

    if (response.statusCode == 200) {
      return AiResponse.fromJson(jsonDecode(response.body));
    } else {
      throw Exception("Failed to evaluate response: ${response.body}");
    }
  }
}
