import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/ai_response.dart';
import '../models/guided_setting.dart';
import '../models/guided_topic.dart';
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

  Future<List<GuidedTopic>> getTopics() async {
    final response = await http
        .get(Uri.parse('$baseUrl/api/topics'))
        .timeout(const Duration(seconds: 8));
    if (response.statusCode != 200) {
      throw Exception('Failed to load topics: ${response.body}');
    }
    final data = jsonDecode(response.body) as List<dynamic>;
    return data
        .map((item) => GuidedTopic.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<GuidedSetting>> getSettingsForTopic(String topicId) async {
    final response = await http
        .get(Uri.parse('$baseUrl/api/topics/$topicId/settings'))
        .timeout(const Duration(seconds: 8));
    if (response.statusCode != 200) {
      throw Exception(
        'Failed to load settings for topic $topicId: ${response.body}',
      );
    }
    final data = jsonDecode(response.body) as List<dynamic>;
    return data
        .map((item) => GuidedSetting.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<GuidedSetting> getSettingDetail(String settingId) async {
    final response = await http
        .get(Uri.parse('$baseUrl/api/settings/$settingId'))
        .timeout(const Duration(seconds: 8));
    if (response.statusCode != 200) {
      throw Exception(
        'Failed to load setting detail $settingId: ${response.body}',
      );
    }
    return GuidedSetting.fromJson(
      jsonDecode(response.body) as Map<String, dynamic>,
    );
  }

  Future<void> prepareTts({
    required String text,
    required String gender,
    required String aiRole,
  }) async {
    if (text.trim().isEmpty) return;
    await http
        .post(
          Uri.parse('$baseUrl/api/tts'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'text': text, 'gender': gender, 'ai_role': aiRole}),
        )
        .timeout(const Duration(seconds: 8));
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
    String? topicId,
    String? settingId,
    required int studentResponseCount,
    required List<Map<String, String>> conversationHistory,
    required String studentResponse,
    String? studentDisplayName,
    String? studentId,
  }) async {
    final url = Uri.parse("$baseUrl/api/chat/evaluate-turn");

    final payload = <String, dynamic>{
      "session_id": sessionId,
      "scenario_id": scenarioId,
      if (topicId != null && topicId.isNotEmpty) "topic_id": topicId,
      if (settingId != null && settingId.isNotEmpty) "setting_id": settingId,
      "student_response_count": studentResponseCount,
      "conversation_history": conversationHistory,
      "student_response": studentResponse,
      "student_display_name": studentDisplayName,
      "student_id": studentId,
    };

    final response = await http
        .post(
          url,
          headers: {"Content-Type": "application/json"},
          body: jsonEncode(payload),
        )
        .timeout(const Duration(seconds: 35));

    if (response.statusCode == 200) {
      return AiResponse.fromJson(jsonDecode(response.body));
    } else {
      throw Exception("Failed to evaluate response: ${response.body}");
    }
  }

  Future<AiResponse> respondTurn({
    required String sessionId,
    required String scenarioId,
    String? topicId,
    String? settingId,
    required int studentResponseCount,
    required List<Map<String, String>> conversationHistory,
    required String studentResponse,
    String? studentDisplayName,
    String? studentId,
  }) async {
    final url = Uri.parse("$baseUrl/api/chat/respond-turn");

    final payload = <String, dynamic>{
      "session_id": sessionId,
      "scenario_id": scenarioId,
      if (topicId != null && topicId.isNotEmpty) "topic_id": topicId,
      if (settingId != null && settingId.isNotEmpty) "setting_id": settingId,
      "student_response_count": studentResponseCount,
      "conversation_history": conversationHistory,
      "student_response": studentResponse,
      "student_display_name": studentDisplayName,
      "student_id": studentId,
    };

    final response = await http
        .post(
          url,
          headers: {"Content-Type": "application/json"},
          body: jsonEncode(payload),
        )
        .timeout(const Duration(seconds: 12));

    if (response.statusCode == 200) {
      return AiResponse.fromJson(jsonDecode(response.body));
    } else {
      throw Exception("Failed to generate response: ${response.body}");
    }
  }
}
