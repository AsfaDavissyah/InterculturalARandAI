import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/ai_response.dart';

class ChatService {
  // Emulator Android:
  static const String baseUrl = "http://10.0.2.2:3000";

  // Kalau pakai HP asli, ganti menjadi IP laptop, contoh:
  // static const String baseUrl = "http://192.168.1.8:3000";

  Future<Map<String, dynamic>> getScenario() async {
    final url = Uri.parse("$baseUrl/api/scenarios/g-icc-008");

    final response = await http.get(url);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception("Failed to load scenario: ${response.body}");
    }
  }

  Future<AiResponse> evaluateTurn({
    required int turnNumber,
    required List<Map<String, String>> conversationHistory,
    required String studentResponse,
  }) async {
    final url = Uri.parse("$baseUrl/api/chat/evaluate-turn");

    final response = await http.post(
      url,
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({
        "scenario_id": "G-ICC-008",
        "turn_number": turnNumber,
        "conversation_history": conversationHistory,
        "student_response": studentResponse,
      }),
    );

    if (response.statusCode == 200) {
      return AiResponse.fromJson(jsonDecode(response.body));
    } else {
      throw Exception("Failed to evaluate response: ${response.body}");
    }
  }
}
