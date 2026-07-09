import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/practice_session.dart';
import 'app_settings.dart';
import 'auth_service.dart';

class PracticeHistoryStore {
  static const storageKey = 'practice_history_v1';
  static const maximumStoredSessions = 100;

  const PracticeHistoryStore();

  /// Loads practice sessions. Attempts to fetch online from MongoDB first.
  /// Falls back to local SharedPreferences storage if offline or not logged in.
  Future<List<PracticeSession>> loadSessions() async {
    final token = await AuthService.getToken();
    if (token != null && token.isNotEmpty) {
      try {
        final baseUrl = await AppSettings.getBaseUrl();
        final url = Uri.parse('$baseUrl/api/history');
        final response = await http.get(
          url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
        );

        if (response.statusCode == 200) {
          final decoded = jsonDecode(response.body) as List<dynamic>;
          final sessions = decoded
              .map(
                (item) => PracticeSession.fromJson(
                  Map<String, dynamic>.from(item as Map),
                ),
              )
              .toList();
          return sessions;
        }
      } catch (_) {
        // Fallback to local storage if API call fails (offline mode)
      }
    }

    // Local Fallback
    final preferences = await SharedPreferences.getInstance();
    final rawHistory = preferences.getString(storageKey);
    if (rawHistory == null || rawHistory.isEmpty) return [];

    try {
      final decoded = jsonDecode(rawHistory) as List<dynamic>;
      final sessions = decoded
          .map(
            (item) => PracticeSession.fromJson(
              Map<String, dynamic>.from(item as Map),
            ),
          )
          .toList();
      sessions.sort(
        (left, right) => right.completedAt.compareTo(left.completedAt),
      );
      return sessions;
    } catch (_) {
      return [];
    }
  }

  /// Saves a session. Posts it to MongoDB Atlas, and syncs a copy locally.
  Future<void> saveSession(PracticeSession session) async {
    // 1. Local storage save (for instant updates and offline access)
    final sessions = await _loadLocalSessionsOnly();
    sessions.removeWhere((item) => item.sessionId == session.sessionId);
    sessions.insert(0, session);
    final retained = sessions.take(maximumStoredSessions).toList();
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      storageKey,
      jsonEncode(retained.map((item) => item.toJson()).toList()),
    );

    // 2. MongoDB cloud sync if logged in
    final token = await AuthService.getToken();
    if (token != null && token.isNotEmpty) {
      try {
        final baseUrl = await AppSettings.getBaseUrl();
        final url = Uri.parse('$baseUrl/api/history');
        await http.post(
          url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
          body: jsonEncode(session.toJson()),
        );
      } catch (_) {
        // Silently fail database sync, session is preserved locally
      }
    }
  }

  /// Deletes a session. Removes it from local storage and deletes it on MongoDB Atlas.
  Future<void> deleteSession(String sessionId) async {
    // 1. Local delete
    final sessions = await _loadLocalSessionsOnly();
    sessions.removeWhere((item) => item.sessionId == sessionId);
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      storageKey,
      jsonEncode(sessions.map((item) => item.toJson()).toList()),
    );

    // 2. MongoDB cloud delete
    final token = await AuthService.getToken();
    if (token != null && token.isNotEmpty) {
      try {
        final baseUrl = await AppSettings.getBaseUrl();
        final url = Uri.parse('$baseUrl/api/history/$sessionId');
        await http.delete(
          url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
        );
      } catch (_) {
        // Silently fail database sync
      }
    }
  }

  Future<void> clear() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.remove(storageKey);
  }

  /// Helper to load only local sessions without triggering API calls.
  Future<List<PracticeSession>> _loadLocalSessionsOnly() async {
    final preferences = await SharedPreferences.getInstance();
    final rawHistory = preferences.getString(storageKey);
    if (rawHistory == null || rawHistory.isEmpty) return [];

    try {
      final decoded = jsonDecode(rawHistory) as List<dynamic>;
      final sessions = decoded
          .map(
            (item) => PracticeSession.fromJson(
              Map<String, dynamic>.from(item as Map),
            ),
          )
          .toList();
      sessions.sort(
        (left, right) => right.completedAt.compareTo(left.completedAt),
      );
      return sessions;
    } catch (_) {
      return [];
    }
  }
}
