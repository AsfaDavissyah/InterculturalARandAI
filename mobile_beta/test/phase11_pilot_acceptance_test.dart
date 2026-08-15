import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_beta/models/pilot_metadata.dart';
import 'package:mobile_beta/models/practice_session.dart';
import 'package:mobile_beta/models/scenario_topic.dart';
import 'package:mobile_beta/services/app_settings.dart';
import 'package:mobile_beta/services/practice_history_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

PracticeSession buildSession(String id, {PilotMetadata? evidence}) {
  return PracticeSession.fromPractice(
    sessionId: id,
    scenario: const ScenarioTopic(
      id: 'ACADEMIC-LECTURER-OFFICE',
      title: 'Lecturer Office',
      type: 'Academic Communication',
      level: 'B1',
      arScene: 'Lecturer office',
      studentRole: 'Student',
      aiRole: 'Foreign lecturer',
      taskInstruction: 'Ask for clarification politely.',
    ),
    startedAt: DateTime.utc(2026, 8, 15, 8),
    completedAt: DateTime.utc(2026, 8, 15, 8, 5),
    transcript: const [
      {'speaker': 'Student', 'message': 'Good morning, Professor.'},
      {'speaker': 'AI', 'message': 'Good morning. How can I help you?'},
    ],
    evaluations: const [],
    experienceType: 'guided_topic',
    topicId: 'academic-communication',
    settingId: 'ACADEMIC-LECTURER-OFFICE',
    launchSource: 'module_qr',
    moduleId: 'ICC-PILOT-01',
    unitId: 'UNIT-ACADEMIC-01',
    pageId: 'PAGE-LECTURER-OFFICE-01',
    pilotMetadata: evidence,
  );
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test(
    'pilot test context persists device, network, and install type',
    () async {
      await AppSettings.setPilotTestContext(
        const PilotTestContext(
          deviceLabel: 'Samsung A52',
          networkProfile: 'approved_wifi',
          installType: 'fresh_install',
        ),
      );

      final restored = await AppSettings.getPilotTestContext();
      expect(restored.deviceLabel, 'Samsung A52');
      expect(restored.networkProfile, 'approved_wifi');
      expect(restored.installType, 'fresh_install');
    },
  );

  test('Phase 11 evidence round-trips with module attribution', () {
    final evidence = PilotMetadata(
      capturedAt: DateTime.utc(2026, 8, 15, 8, 5),
      deviceLabel: 'Samsung A52',
      platform: 'android',
      osVersion: 'Android 14',
      viewportWidth: 393,
      viewportHeight: 873,
      pixelRatio: 2.75,
      networkProfile: 'mobile_data',
      installType: 'update_install',
      appBuild: '1.0.0+11',
    );
    final restored = PracticeSession.fromJson(
      buildSession('phase11-roundtrip', evidence: evidence).toJson(),
    );

    expect(restored.pilotMetadata?.deviceLabel, 'Samsung A52');
    expect(restored.pilotMetadata?.networkProfile, 'mobile_data');
    expect(restored.moduleId, 'ICC-PILOT-01');
    expect(restored.pageId, 'PAGE-LECTURER-OFFICE-01');
    expect(restored.toJson()['schema_version'], 3);
  });

  test('saving the same session twice does not duplicate history', () async {
    const store = PracticeHistoryStore();
    final session = buildSession('phase11-idempotent');

    await store.saveSession(session);
    await store.saveSession(session);

    final sessions = await store.loadSessions();
    expect(sessions, hasLength(1));
    expect(sessions.single.sessionId, 'phase11-idempotent');
  });

  test('legacy history remains readable without pilot metadata', () {
    final legacyJson = buildSession('legacy-compatible').toJson()
      ..remove('pilot_metadata')
      ..['schema_version'] = 2;

    final restored = PracticeSession.fromJson(legacyJson);
    expect(restored.sessionId, 'legacy-compatible');
    expect(restored.pilotMetadata, isNull);
  });
}
