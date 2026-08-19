import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_beta/models/guided_setting.dart';
import 'package:mobile_beta/services/avatar_registry.dart';
import 'package:mobile_beta/services/setting_sticker_registry.dart';

void main() {
  group('Phase 10 Setting Sticker Registry Tests', () {
    test(
      'canonicalKeys contains all six approved PRD setting sticker keys',
      () {
        expect(SettingStickerRegistry.canonicalKeys, hasLength(6));
        expect(
          SettingStickerRegistry.canonicalKeys,
          containsAll([
            'sticker_lecturer_office',
            'sticker_after_class',
            'sticker_london_restaurant',
            'sticker_melbourne_cafe',
            'sticker_interview_room',
            'sticker_career_fair',
          ]),
        );
      },
    );

    test('every canonical key resolves to a valid asset file path', () {
      for (final key in SettingStickerRegistry.canonicalKeys) {
        final path = SettingStickerRegistry.getAssetPath(key);
        expect(
          path,
          isNotNull,
          reason: 'Key $key must resolve to an asset path',
        );
        expect(path!.startsWith('assets/stickers/'), isTrue);
        expect(path.endsWith('.png'), isTrue);
        expect(SettingStickerRegistry.hasSticker(key), isTrue);
      }
    });

    test('fallback and legacy aliases resolve to the appropriate sticker', () {
      expect(
        SettingStickerRegistry.getAssetPath('academic_office_sticker'),
        'assets/stickers/sticker_lecturer_office.png',
      );
      expect(
        SettingStickerRegistry.getAssetPath('office_sticker'),
        'assets/stickers/sticker_lecturer_office.png',
      );
      expect(
        SettingStickerRegistry.getAssetPath('cafe_sticker'),
        'assets/stickers/sticker_melbourne_cafe.png',
      );
      expect(
        SettingStickerRegistry.getAssetPath('restaurant_sticker'),
        'assets/stickers/sticker_london_restaurant.png',
      );
      expect(
        SettingStickerRegistry.getAssetPath('interview_sticker'),
        'assets/stickers/sticker_interview_room.png',
      );
      expect(
        SettingStickerRegistry.getAssetPath('career_fair_sticker'),
        'assets/stickers/sticker_career_fair.png',
      );
    });

    test('unrecognized or null sticker keys return null safely', () {
      expect(SettingStickerRegistry.getAssetPath(null), isNull);
      expect(SettingStickerRegistry.getAssetPath(''), isNull);
      expect(SettingStickerRegistry.getAssetPath('   '), isNull);
      expect(
        SettingStickerRegistry.getAssetPath('unknown_sticker_key'),
        isNull,
      );
      expect(SettingStickerRegistry.hasSticker(null), isFalse);
      expect(SettingStickerRegistry.hasSticker('unknown'), isFalse);
    });

    testWidgets(
      'SettingStickerView renders fallback smoothly when key is missing or invalid',
      (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SettingStickerView(
                stickerKey: 'non_existent_key',
                size: 48,
              ),
            ),
          ),
        );

        expect(find.byType(SettingStickerView), findsOneWidget);
        expect(find.byIcon(Icons.image_outlined), findsOneWidget);
      },
    );
  });

  group('Phase 10 Avatar and Setting Model Binding', () {
    test('GuidedSetting correctly parses stickerAssetKey from json', () {
      final json = {
        'settingId': 'G-SET-001',
        'title': 'Academic Consultation',
        'location': "Lecturer's Office",
        'briefing': 'Consult with Dr Emma regarding essay feedback.',
        'taskInstruction': 'Ask for clarification on specific points.',
        'studentRole': 'Student',
        'aiCharacter': {
          'name': 'Dr Emma',
          'role': 'Lecturer',
          'avatarKey': 'dr_emma',
          'voiceName': 'en-GB-Neural2-B',
        },
        'stickerAssetKey': 'sticker_lecturer_office',
        'minimumStudentResponses': 4,
        'targetStudentResponses': 6,
        'maximumStudentResponses': 8,
        'openingDialogue': 'Good morning. Come on in and take a seat.',
      };

      final setting = GuidedSetting.fromJson(json);
      expect(setting.settingId, 'G-SET-001');
      expect(setting.stickerAssetKey, 'sticker_lecturer_office');
      expect(
        SettingStickerRegistry.hasSticker(setting.stickerAssetKey),
        isTrue,
      );
      expect(
        SettingStickerRegistry.getAssetPath(setting.stickerAssetKey),
        'assets/stickers/sticker_lecturer_office.png',
      );
    });

    test('AvatarRegistry resolves all 4 Phase 10 avatars accurately', () {
      expect(
        AvatarRegistry.modelPathFor(avatarKey: 'dr_emma', aiRole: 'Lecturer'),
        'assets/models/dr_emma_animated.glb',
      );
      expect(
        AvatarRegistry.modelPathFor(avatarKey: 'sarah', aiRole: 'Peer'),
        'assets/models/sarah_animated.glb',
      );
      expect(
        AvatarRegistry.modelPathFor(avatarKey: 'olivia', aiRole: 'Host'),
        'assets/models/olivia_animated.glb',
      );
      expect(
        AvatarRegistry.modelPathFor(avatarKey: 'hr', aiRole: 'HR'),
        'assets/models/hr_animated.glb',
      );
      expect(
        AvatarRegistry.modelPathFor(
          avatarKey: 'michael',
          aiRole: 'Interviewer',
        ),
        'assets/models/hr_animated.glb',
      );
    });
  });
}
