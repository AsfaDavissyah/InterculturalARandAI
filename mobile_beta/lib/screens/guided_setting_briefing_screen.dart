import 'dart:async';

import 'package:flutter/material.dart';

import '../models/guided_setting.dart';
import '../models/guided_topic.dart';
import '../models/scenario_topic.dart';
import '../services/app_settings.dart';
import '../services/chat_service.dart';
import '../services/page_transitions.dart';
import 'ar_speaking_screen.dart';

class GuidedSettingBriefingScreen extends StatelessWidget {
  final GuidedTopic topic;
  final GuidedSetting setting;
  final String launchSource;
  final String? moduleId;
  final String? unitId;
  final String? pageId;
  final String? moduleTitle;
  final String? pageInstructions;

  const GuidedSettingBriefingScreen({
    super.key,
    required this.topic,
    required this.setting,
    this.launchSource = 'browse',
    this.moduleId,
    this.unitId,
    this.pageId,
    this.moduleTitle,
    this.pageInstructions,
  });

  static const Color _orange = Color(0xFFD4842A);

  void _startPractice(BuildContext context) {
    // Map setting to a ScenarioTopic structure for compatibility
    final syntheticScenario = ScenarioTopic(
      id: setting.settingId,
      title: setting.title,
      type: topic.title,
      level: 'B1',
      arScene: setting.location,
      studentRole: setting.studentRole,
      aiRole:
          '${setting.aiCharacter.displayName} (${setting.aiCharacter.role})',
      taskInstruction: setting.taskInstruction,
    );

    Navigator.push(
      context,
      SlideUpRoute(
        page: ArSpeakingScreen(
          scenario: syntheticScenario,
          topicId: topic.topicId,
          topicTitle: topic.title,
          settingId: setting.settingId,
          settingTitle: setting.title,
          avatarKey: setting.aiCharacter.avatarKey,
          stickerAssetKey: setting.stickerAssetKey,
          guidedSetting: setting,
          experienceType: 'guided_topic',
          launchSource: launchSource,
          moduleId: moduleId,
          unitId: unitId,
          pageId: pageId,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? Colors.white : Colors.black;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_rounded, color: primaryColor),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          setting.title,
          style: TextStyle(
            color: primaryColor,
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            _OpeningVoiceWarmup(setting: setting),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (launchSource == 'module_qr') ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: _orange.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.qr_code_2_rounded, color: _orange),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    moduleTitle ?? 'Learning Module',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                      color: _orange,
                                    ),
                                  ),
                                  if ((pageInstructions ?? '').isNotEmpty)
                                    Text(
                                      pageInstructions!,
                                      style: TextStyle(
                                        color: primaryColor.withValues(
                                          alpha: 0.7,
                                        ),
                                        fontSize: 13,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    // Topic Tag
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: _orange.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        topic.title.toUpperCase(),
                        style: const TextStyle(
                          color: _orange,
                          fontWeight: FontWeight.w800,
                          fontSize: 11,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Title & Location
                    Text(
                      setting.title,
                      style: TextStyle(
                        color: primaryColor,
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          Icons.location_on_outlined,
                          size: 16,
                          color: primaryColor.withValues(alpha: 0.6),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          setting.location,
                          style: TextStyle(
                            color: primaryColor.withValues(alpha: 0.6),
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // Briefing Card
                    if (setting.briefing.isNotEmpty) ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.grey.shade900 : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: primaryColor.withValues(alpha: 0.08),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(
                                  Icons.info_outline_rounded,
                                  color: _orange,
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Scenario Briefing',
                                  style: TextStyle(
                                    color: primaryColor,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              setting.briefing,
                              style: TextStyle(
                                color: primaryColor.withValues(alpha: 0.8),
                                fontSize: 13.5,
                                height: 1.45,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Roles Card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.grey.shade900 : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: primaryColor.withValues(alpha: 0.08),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Conversation Roles',
                            style: TextStyle(
                              color: primaryColor,
                              fontWeight: FontWeight.w800,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _buildRoleRow(
                            context,
                            icon: Icons.person_outline_rounded,
                            label: 'Your Role',
                            value: setting.studentRole,
                            primaryColor: primaryColor,
                          ),
                          const Divider(height: 20),
                          _buildRoleRow(
                            context,
                            icon: Icons.smart_toy_outlined,
                            label: 'AI Partner',
                            value:
                                '${setting.aiCharacter.displayName} | ${setting.aiCharacter.role} (${setting.aiCharacter.culture})',
                            primaryColor: primaryColor,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Task Instruction Card
                    if (setting.taskInstruction.isNotEmpty) ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.grey.shade900 : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: primaryColor.withValues(alpha: 0.08),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(
                                  Icons.task_alt_rounded,
                                  color: Colors.green,
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Your Task',
                                  style: TextStyle(
                                    color: primaryColor,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              setting.taskInstruction,
                              style: TextStyle(
                                color: primaryColor.withValues(alpha: 0.8),
                                fontSize: 13.5,
                                height: 1.45,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Target Turns Card
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      decoration: BoxDecoration(
                        color: _orange.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: _orange.withValues(alpha: 0.2),
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.timer_outlined,
                            color: _orange,
                            size: 20,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Target ${setting.sessionRules.targetStudentResponsesMin}-${setting.sessionRules.targetStudentResponsesMax} speaking turns to complete all learning objectives.',
                              style: const TextStyle(
                                color: _orange,
                                fontWeight: FontWeight.w700,
                                fontSize: 12.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Start Button Container
            Padding(
              padding: const EdgeInsets.all(24),
              child: SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  onPressed: () => _startPractice(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _orange,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.videocam_rounded, size: 22),
                      SizedBox(width: 10),
                      Text(
                        'Start AR Practice',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoleRow(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String value,
    required Color primaryColor,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: primaryColor.withValues(alpha: 0.5)),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label.toUpperCase(),
                style: TextStyle(
                  color: primaryColor.withValues(alpha: 0.5),
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: TextStyle(
                  color: primaryColor,
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _OpeningVoiceWarmup extends StatefulWidget {
  final GuidedSetting setting;

  const _OpeningVoiceWarmup({required this.setting});

  @override
  State<_OpeningVoiceWarmup> createState() => _OpeningVoiceWarmupState();
}

class _OpeningVoiceWarmupState extends State<_OpeningVoiceWarmup> {
  @override
  void initState() {
    super.initState();
    unawaited(_prepareOpeningVoice());
  }

  Future<void> _prepareOpeningVoice() async {
    final character = widget.setting.aiCharacter;
    final identity =
        '${character.displayName} ${character.role} ${character.avatarKey}'
            .toLowerCase();
    final gender =
        identity.contains('michael') ||
            identity.contains('hr_manager') ||
            identity.contains('male') ||
            identity.contains('mr.')
        ? 'male'
        : 'female';

    try {
      final baseUrl = await AppSettings.getBaseUrl();
      await ChatService(baseUrl: baseUrl).prepareTts(
        text: widget.setting.buildOpeningMessage(),
        gender: gender,
        aiRole: '${character.displayName} (${character.role})',
      );
    } catch (_) {
      // AR startup still has neural and local TTS fallbacks.
    }
  }

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}
