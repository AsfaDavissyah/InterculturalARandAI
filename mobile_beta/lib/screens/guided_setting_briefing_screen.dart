import 'dart:async';

import 'package:flutter/material.dart';

import '../models/guided_setting.dart';
import '../models/guided_topic.dart';
import '../models/scenario_topic.dart';
import '../services/app_settings.dart';
import '../services/chat_service.dart';
import '../services/page_transitions.dart';
import '../theme/engora_theme.dart';
import '../widgets/app_svg_icon.dart';
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

  void _startPractice(BuildContext context) {
    final scenario = ScenarioTopic(
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
          scenario: scenario,
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
    return Scaffold(
      body: Column(
        children: [
          _OpeningVoiceWarmup(setting: setting),
          _BriefingHeader(
            title: setting.title,
            location: setting.location,
            onBack: () => Navigator.pop(context),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 18),
              children: [
                if (launchSource == 'module_qr') ...[
                  _ModuleSourceCard(
                    title: moduleTitle ?? 'Learning Module',
                    instructions: pageInstructions,
                  ),
                  const SizedBox(height: 10),
                ],
                _BriefingCard(
                  asset: AppIcons.messages,
                  title: 'Scenario Building',
                  description: setting.briefing.isEmpty
                      ? setting.location
                      : setting.briefing,
                ),
                const SizedBox(height: 10),
                _BriefingCard(
                  asset: AppIcons.checkCircle,
                  title: 'Your Task',
                  description: setting.taskInstruction,
                ),
                const SizedBox(height: 10),
                const Text(
                  'Conversation Roles',
                  style: TextStyle(
                    color: EngoraColors.muted,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 8),
                _BriefingCard(
                  asset: AppIcons.user,
                  title: 'Your Role',
                  description: setting.studentRole,
                ),
                const SizedBox(height: 10),
                _BriefingCard(
                  asset: AppIcons.userRobot,
                  title: 'AI Partner',
                  description:
                      '${setting.aiCharacter.displayName}, ${setting.aiCharacter.role}',
                ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 10, 24, 18),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => _startPractice(context),
                  child: const Text('Start AR Practice'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BriefingHeader extends StatelessWidget {
  final String title;
  final String location;
  final VoidCallback onBack;

  const _BriefingHeader({
    required this.title,
    required this.location,
    required this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(
        24,
        MediaQuery.paddingOf(context).top + 14,
        24,
        26,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(22)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconButton(
            tooltip: 'Back',
            onPressed: onBack,
            icon: const AppSvgIcon(AppIcons.back, size: 26),
            style: IconButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: EngoraColors.ink,
              minimumSize: const Size(48, 48),
              side: BorderSide(color: EngoraColors.ink.withValues(alpha: 0.06)),
            ),
          ),
          const SizedBox(height: 18),
          Text(title, style: EngoraTheme.display(fontSize: 30, height: 1.35)),
          const SizedBox(height: 4),
          Text(location, style: const TextStyle(color: EngoraColors.muted)),
        ],
      ),
    );
  }
}

class _BriefingCard extends StatelessWidget {
  final String asset;
  final String title;
  final String description;

  const _BriefingCard({
    required this.asset,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 14, 16, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: EngoraColors.line),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppSvgIcon(asset, color: EngoraColors.ink, size: 26),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: const TextStyle(
                    color: EngoraColors.muted,
                    fontSize: 12.5,
                    height: 1.25,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ModuleSourceCard extends StatelessWidget {
  final String title;
  final String? instructions;

  const _ModuleSourceCard({required this.title, this.instructions});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: EngoraColors.academic,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const AppSvgIcon(AppIcons.info, color: EngoraColors.brand, size: 24),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                if ((instructions ?? '').trim().isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(
                    instructions!,
                    style: const TextStyle(
                      color: EngoraColors.muted,
                      fontSize: 12,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
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
      final service = ChatService(baseUrl: await AppSettings.getBaseUrl());
      await service.prepareTts(
        text: widget.setting.buildOpeningMessage(),
        gender: gender,
        aiRole: '${character.displayName} (${character.role})',
      );
    } catch (_) {
      // AR startup has neural and local TTS fallbacks.
    }
  }

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}
