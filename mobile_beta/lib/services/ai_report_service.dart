import 'dart:convert';

import 'package:http/http.dart' as http;

import 'app_settings.dart';
import 'auth_service.dart';

class AiReportService {
  const AiReportService();

  Future<void> reportResponse({
    required String sessionId,
    required String scenarioId,
    required int turnNumber,
    required String responseText,
    required String category,
    String notes = '',
  }) async {
    final token = await AuthService.getToken();
    if (token == null || token.isEmpty) {
      throw Exception('Sign in again before submitting a report.');
    }
    final baseUrl = await AppSettings.getBaseUrl();
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/reports/ai-response'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'session_id': sessionId,
          'scenario_id': scenarioId,
          'turn_number': turnNumber,
          'response_text': responseText,
          'category': category,
          'notes': notes,
        }),
      );
      if (response.statusCode == 201) return;
      Map<String, dynamic>? data;
      try {
        data = jsonDecode(response.body) as Map<String, dynamic>;
      } catch (_) {}
      throw Exception(
        data?['error']?.toString() ?? 'The report could not be submitted.',
      );
    } catch (error) {
      if (error.toString().contains('Exception:')) rethrow;
      throw Exception('Could not connect to the server. Please try again.');
    }
  }
}
