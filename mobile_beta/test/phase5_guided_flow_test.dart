import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_beta/data/guided_topic_fallback.dart';
import 'package:mobile_beta/models/guided_setting.dart';
import 'package:mobile_beta/models/guided_topic.dart';
import 'package:mobile_beta/models/practice_session.dart';
import 'package:mobile_beta/models/scenario_topic.dart';
import 'package:mobile_beta/services/avatar_registry.dart';

void main() {
  group('Phase 5 Guided Topic Mobile Flow Tests', () {
    test('fallback topics match the three approved guided topics', () {
      final topics = buildFallbackGuidedTopics();
      expect(topics.map((topic) => topic.topicId), [
        'academic-communication',
        'social-communication',
        'professional-communication',
      ]);
      expect(topics[1].title, 'Social Communication');
      expect(
        topics[1].languageObjectives,
        contains('Ordering food and drinks'),
      );
    });

    test('avatar registry covers every guided avatar key', () {
      expect(
        AvatarRegistry.modelPathFor(avatarKey: 'female_lecturer_v1'),
        AvatarRegistry.femalePrototype,
      );
      expect(
        AvatarRegistry.modelPathFor(avatarKey: 'waitress_v1'),
        AvatarRegistry.femalePrototype,
      );
      expect(
        AvatarRegistry.modelPathFor(avatarKey: 'barista_v1'),
        AvatarRegistry.olivia,
      );
      expect(
        AvatarRegistry.modelPathFor(avatarKey: 'hr_manager_v1'),
        AvatarRegistry.malePrototype,
      );
      expect(
        AvatarRegistry.modelPathFor(avatarKey: 'olivia_reed'),
        AvatarRegistry.olivia,
      );
    });

    test('avatar role fallback never treats female as male', () {
      expect(
        AvatarRegistry.modelPathFor(aiRole: 'Female lecturer'),
        AvatarRegistry.femalePrototype,
      );
      expect(
        AvatarRegistry.modelPathFor(aiRole: 'Male HR manager'),
        AvatarRegistry.malePrototype,
      );
    });

    test('GuidedTopic parses JSON correctly', () {
      final json = {
        'topicId': 'academic-communication',
        'title': 'Academic Communication',
        'description': 'Practice academic dialogue',
        'iconKey': 'school',
        'displayOrder': 1,
        'isActive': true,
        'languageObjectives': ['Formal inquiries'],
        'iccObjectives': ['Power distance'],
      };

      final topic = GuidedTopic.fromJson(json);
      expect(topic.topicId, 'academic-communication');
      expect(topic.title, 'Academic Communication');
      expect(topic.languageObjectives.length, 1);
      expect(topic.iccObjectives.length, 1);
    });

    test('GuidedSetting parses JSON and session rules correctly', () {
      final json = {
        'settingId': 'ACADEMIC-LECTURER-OFFICE',
        'topicId': 'academic-communication',
        'title': 'Lecturer Office',
        'location': 'Office Building 3rd Floor',
        'briefing': 'Request a deadline extension',
        'stickerAssetKey': 'office_sticker',
        'studentRole': 'Undergraduate Student',
        'aiCharacter': {
          'display_name': 'Dr. Jenkins',
          'role': 'Academic Advisor',
          'culture': 'United Kingdom',
          'avatar_key': 'female_lecturer_v1',
        },
        'taskInstruction': 'Explain reasons clearly',
        'sessionRules': {
          'minimumStudentResponses': 5,
          'targetStudentResponsesMin': 6,
          'targetStudentResponsesMax': 8,
          'maximumStudentResponses': 10,
        },
        'displayOrder': 1,
        'isActive': true,
      };

      final setting = GuidedSetting.fromJson(json);
      expect(setting.settingId, 'ACADEMIC-LECTURER-OFFICE');
      expect(setting.aiCharacter.displayName, 'Dr. Jenkins');
      expect(setting.sessionRules.targetStudentResponsesMin, 6);
      expect(setting.sessionRules.maximumStudentResponses, 10);
      expect(
        setting.buildOpeningMessage(),
        "Hello. I'm Dr. Jenkins. It's nice to meet you. Whenever you're ready, please begin.",
      );
    });

    test('GuidedSetting opening does not invent a learner name', () {
      final setting = GuidedSetting.fromJson({
        'setting_id': 'SOCIAL-LONDON-RESTAURANT',
        'topic_id': 'social-communication',
        'title': 'Restaurant in London',
        'location': 'London Restaurant',
        'student_role': 'Customer',
        'ai_character': {
          'display_name': 'Sarah Bennett',
          'role': 'British restaurant waitress',
          'culture': 'United Kingdom',
          'avatar_key': 'sarah_bennett',
        },
      });

      final opening = setting.buildOpeningMessage();
      expect(opening, contains('Sarah Bennett'));
      expect(opening, isNot(contains('Rina')));
      expect(opening, isNot(contains('David')));
    });

    test('PracticeSession preserves guided topic and setting metadata', () {
      final scenario = ScenarioTopic(
        id: 'ACADEMIC-LECTURER-OFFICE',
        title: 'Lecturer Office',
        type: 'Academic Communication',
        level: 'B1',
        arScene: 'Office Building 3rd Floor',
        studentRole: 'Student',
        aiRole: 'Lecturer',
        taskInstruction: 'Ask for deadline extension',
      );

      final session = PracticeSession.fromPractice(
        sessionId: 'session_guided_test_001',
        scenario: scenario,
        startedAt: DateTime.now().subtract(const Duration(minutes: 5)),
        completedAt: DateTime.now(),
        transcript: [
          {'speaker': 'Student', 'message': 'Hello Dr. Jenkins'},
          {'speaker': 'AI', 'message': 'Hello, how can I help you today?'},
        ],
        evaluations: [],
        experienceType: 'guided_topic',
        topicId: 'academic-communication',
        topicTitle: 'Academic Communication',
        settingId: 'ACADEMIC-LECTURER-OFFICE',
        settingTitle: 'Lecturer Office',
        avatarKey: 'female_lecturer_v1',
        launchSource: 'browse',
      );

      final json = session.toJson();
      expect(json['experience_type'], 'guided_topic');
      expect(json['topic_id'], 'academic-communication');
      expect(json['setting_id'], 'ACADEMIC-LECTURER-OFFICE');
      expect(json['avatar_key'], 'female_lecturer_v1');
      expect(json['launch_source'], 'browse');

      final reconstructed = PracticeSession.fromJson(json);
      expect(reconstructed.experienceType, 'guided_topic');
      expect(reconstructed.topicId, 'academic-communication');
      expect(reconstructed.settingId, 'ACADEMIC-LECTURER-OFFICE');
    });
  });
}
