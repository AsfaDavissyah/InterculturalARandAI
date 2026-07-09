import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_beta/models/ai_response.dart';
import 'package:mobile_beta/models/practice_session.dart';
import 'package:mobile_beta/models/scenario_topic.dart';
import 'package:mobile_beta/screens/ar_speaking_screen.dart';
import 'package:mobile_beta/services/app_settings.dart';
import 'package:mobile_beta/services/practice_history_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('cameraPreviewDisplaySize', () {
    const sensorSize = Size(1280, 720);

    test('swaps sensor dimensions for portrait preview', () {
      expect(
        cameraPreviewDisplaySize(sensorSize, Orientation.portrait),
        const Size(720, 1280),
      );
    });

    test('keeps sensor dimensions for landscape preview', () {
      expect(
        cameraPreviewDisplaySize(sensorSize, Orientation.landscape),
        sensorSize,
      );
    });
  });

  group('AppSettings.normalizeBaseUrl', () {
    test('adds the HTTP scheme for a LAN address', () {
      expect(
        AppSettings.normalizeBaseUrl('192.168.0.103:3000'),
        'http://192.168.0.103:3000',
      );
    });

    test('removes trailing slashes without changing HTTPS', () {
      expect(
        AppSettings.normalizeBaseUrl('https://example.test///'),
        'https://example.test',
      );
    });
  });

  test('AiResponse reads objective and session progress metadata', () {
    final response = AiResponse.fromJson({
      'scenario_id': 'G-ICC-008',
      'turn_number': 6,
      'ai_message': 'Thank you for your help.',
      'detected_category': 'GOOD',
      'scores': <String, dynamic>{},
      'feedback': '',
      'cultural_note': '',
      'improved_response': '',
      'continue_conversation': false,
      'completed_objective_ids': ['confirm_and_welcome'],
      'session_progress': {
        'student_response_count': 6,
        'session_complete': true,
      },
      'end_reason': 'objectives_completed',
      'source': 'rule_based',
    });

    expect(response.turnNumber, 6);
    expect(response.completedObjectiveIds, ['confirm_and_welcome']);
    expect(response.sessionProgress['session_complete'], isTrue);
    expect(response.continueConversation, isFalse);
  });

  test('PracticeSession creates a dashboard-ready record', () {
    final response = AiResponse.fromJson({
      'session_id': 'session_test',
      'scenario_id': 'G-ICC-008',
      'turn_number': 1,
      'ai_message': 'Thank you.',
      'detected_category': 'GOOD',
      'scores': {for (final key in PracticeSession.scoreKeys) key: 4},
      'feedback': 'Clear response.',
      'cultural_note': 'Respect local context.',
      'improved_response': 'Welcome to our university.',
      'continue_conversation': false,
      'completed_objective_ids': ['confirm_and_welcome'],
      'session_progress': {'session_complete': true},
      'end_reason': 'objectives_completed',
      'source': 'openai',
    });
    final scenario = scenarioTopics.firstWhere(
      (item) => item.id == 'G-ICC-008',
    );
    final startedAt = DateTime.utc(2026, 7, 7, 8);
    final session = PracticeSession.fromPractice(
      sessionId: 'session_test',
      scenario: scenario,
      startedAt: startedAt,
      completedAt: startedAt.add(const Duration(minutes: 3)),
      transcript: const [
        {'speaker': 'Student', 'message': 'Welcome to our university.'},
      ],
      evaluations: [response],
    );
    final dashboardRecord = session.toDashboardRecord();

    expect(session.durationSeconds, 180);
    expect(session.overallScore, 4);
    expect(session.status, 'completed');
    expect(dashboardRecord['session_id'], 'session_test');
    expect(dashboardRecord['scenario_id'], 'G-ICC-008');
    expect(dashboardRecord['average_scores'], isA<Map<String, double>>());
  });

  test('PracticeHistoryStore persists sessions after reload', () async {
    SharedPreferences.setMockInitialValues({});
    const store = PracticeHistoryStore();
    final scenario = scenarioTopics.first;
    final response = AiResponse.fromJson({
      'session_id': 'session_saved',
      'scenario_id': scenario.id,
      'turn_number': 1,
      'ai_message': 'Let us continue.',
      'detected_category': 'ACCEPTABLE',
      'scores': {for (final key in PracticeSession.scoreKeys) key: 3},
      'feedback': '',
      'cultural_note': '',
      'improved_response': '',
      'continue_conversation': true,
      'completed_objective_ids': <String>[],
      'session_progress': {'session_complete': false},
      'source': 'local_fallback',
    });
    final now = DateTime.utc(2026, 7, 7, 9);
    final session = PracticeSession.fromPractice(
      sessionId: 'session_saved',
      scenario: scenario,
      startedAt: now,
      completedAt: now.add(const Duration(seconds: 75)),
      transcript: const [
        {'speaker': 'AI', 'message': 'Hello.'},
      ],
      evaluations: [response],
    );

    await store.saveSession(session);
    final restored = await const PracticeHistoryStore().loadSessions();

    expect(restored, hasLength(1));
    expect(restored.single.sessionId, 'session_saved');
    expect(restored.single.transcript.single['message'], 'Hello.');
  });

  test('local scenario fallback contains all Scenario Engine V2 topics', () {
    expect(scenarioTopics, hasLength(10));
    expect(
      scenarioTopics.map((scenario) => scenario.id),
      containsAll(['G-ICC-008', 'N-ICC-005', 'M-ICC-010']),
    );
    expect(
      scenarioTopics.firstWhere((scenario) => scenario.id == 'G-ICC-008').title,
      'Meeting an International Student on Campus',
    );
    expect(
      scenarioTopics.firstWhere((scenario) => scenario.id == 'N-ICC-005').title,
      'Talking About Culture on Campus',
    );
  });
}
