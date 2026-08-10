import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_beta/models/module_launch.dart';
import 'package:mobile_beta/models/practice_session.dart';
import 'package:mobile_beta/models/scenario_topic.dart';

void main() {
  test('ModuleLaunch parses QR resolver data', () {
    final launch = ModuleLaunch.fromJson({
      'launch': {
        'launch_source': 'module_qr',
        'module_id': 'ICC-MODULE-01',
        'unit_id': 'ICC-UNIT-01',
        'page_id': 'ICC-PAGE-01',
      },
      'module': {'title': 'Intercultural Speaking Module'},
      'unit': {'title': 'Academic Communication'},
      'page': {
        'title': 'Meet a Foreign Lecturer',
        'instructions': 'Scan and begin the role-play.',
      },
      'topic': {
        'topicId': 'academic-communication',
        'title': 'Academic Communication',
      },
      'setting': {
        'settingId': 'ACADEMIC-LECTURER-OFFICE',
        'topicId': 'academic-communication',
        'title': 'Lecturer Office',
        'location': 'Lecturer Office',
        'studentRole': 'Student',
        'aiCharacter': {
          'display_name': 'Dr Emma Collins',
          'role': 'Foreign lecturer',
          'avatar_key': 'dr_emma',
        },
      },
    });

    expect(launch.moduleId, 'ICC-MODULE-01');
    expect(launch.pageId, 'ICC-PAGE-01');
    expect(launch.setting.settingId, 'ACADEMIC-LECTURER-OFFICE');
  });

  test('PracticeSession persists module QR attribution', () {
    final session = PracticeSession.fromPractice(
      sessionId: 'session_module_qr_001',
      scenario: const ScenarioTopic(
        id: 'ACADEMIC-LECTURER-OFFICE',
        title: 'Lecturer Office',
        type: 'Academic Communication',
        level: 'B1',
        arScene: 'Lecturer Office',
        studentRole: 'Student',
        aiRole: 'Foreign lecturer',
        taskInstruction: 'Ask a question politely.',
      ),
      startedAt: DateTime.utc(2026, 8, 10, 10),
      completedAt: DateTime.utc(2026, 8, 10, 10, 5),
      transcript: const [],
      evaluations: const [],
      experienceType: 'guided_topic',
      topicId: 'academic-communication',
      settingId: 'ACADEMIC-LECTURER-OFFICE',
      launchSource: 'module_qr',
      moduleId: 'ICC-MODULE-01',
      unitId: 'ICC-UNIT-01',
      pageId: 'ICC-PAGE-01',
    );

    final json = session.toJson();
    expect(json['launch_source'], 'module_qr');
    expect(json['module_id'], 'ICC-MODULE-01');
    expect(json['unit_id'], 'ICC-UNIT-01');
    expect(json['page_id'], 'ICC-PAGE-01');

    final restored = PracticeSession.fromJson(json);
    expect(restored.moduleId, 'ICC-MODULE-01');
    expect(restored.pageId, 'ICC-PAGE-01');
  });
}
