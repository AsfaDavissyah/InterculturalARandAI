import 'package:flutter/material.dart';

import '../models/guided_setting.dart';
import '../models/guided_topic.dart';
import '../services/app_settings.dart';
import '../services/chat_service.dart';
import '../services/page_transitions.dart';
import '../theme/engora_theme.dart';
import '../widgets/app_svg_icon.dart';
import 'guided_setting_briefing_screen.dart';

class GuidedSettingsScreen extends StatefulWidget {
  final GuidedTopic topic;

  const GuidedSettingsScreen({super.key, required this.topic});

  @override
  State<GuidedSettingsScreen> createState() => _GuidedSettingsScreenState();
}

class _GuidedSettingsScreenState extends State<GuidedSettingsScreen> {
  List<GuidedSetting> _settings = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchSettings();
  }

  Future<void> _fetchSettings() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final service = ChatService(baseUrl: await AppSettings.getBaseUrl());
      final settings = await service.getSettingsForTopic(widget.topic.topicId);
      if (mounted) {
        setState(() {
          _settings = settings;
          _loading = false;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error.toString().replaceFirst('Exception: ', '');
          _loading = false;
        });
      }
    }
  }

  void _openSetting(GuidedSetting setting) {
    Navigator.push(
      context,
      SlideUpRoute(
        page: GuidedSettingBriefingScreen(
          topic: widget.topic,
          setting: setting,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final palette = TopicPalette.fromTopic(widget.topic.topicId);
    return Scaffold(
      appBar: AppBar(
        leadingWidth: 72,
        leading: Padding(
          padding: const EdgeInsets.only(left: 20),
          child: IconButton(
            tooltip: 'Back',
            onPressed: () => Navigator.pop(context),
            icon: const AppSvgIcon(AppIcons.back, size: 26),
            style: IconButton.styleFrom(
              backgroundColor: Colors.white,
              minimumSize: const Size(48, 48),
            ),
          ),
        ),
        title: Text(widget.topic.title),
      ),
      body: SafeArea(
        top: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 28, 24, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Practice Settings',
                    style: EngoraTheme.display(fontSize: 29),
                  ),
                  const SizedBox(height: 5),
                  const Text(
                    'Choose a specific environment to begin immersive practice.',
                    style: TextStyle(color: EngoraColors.muted, fontSize: 13),
                  ),
                ],
              ),
            ),
            Expanded(child: _buildContent(palette)),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(TopicPalette palette) {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: EngoraColors.brand),
      );
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.cloud_off_outlined,
                size: 42,
                color: EngoraColors.muted,
              ),
              const SizedBox(height: 12),
              const Text(
                'Could not load practice settings',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 5),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: EngoraColors.muted, fontSize: 12),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _fetchSettings,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Try Again'),
              ),
            ],
          ),
        ),
      );
    }
    if (_settings.isEmpty) {
      return const Center(
        child: Text(
          'No settings are available for this topic.',
          style: TextStyle(color: EngoraColors.muted),
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
      itemCount: _settings.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) => _SettingCard(
        setting: _settings[index],
        palette: palette,
        onTap: () => _openSetting(_settings[index]),
      ),
    );
  }
}

class _SettingCard extends StatelessWidget {
  final GuidedSetting setting;
  final TopicPalette palette;
  final VoidCallback onTap;

  const _SettingCard({
    required this.setting,
    required this.palette,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: palette.background,
      borderRadius: BorderRadius.circular(20),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: EngoraColors.background,
                child: Icon(
                  Icons.view_in_ar_outlined,
                  color: palette.accent,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            setting.title,
                            style: const TextStyle(
                              fontSize: 16,
                              height: 1.15,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          constraints: const BoxConstraints(maxWidth: 108),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 9,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            border: Border.all(color: palette.accent),
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: Text(
                            setting.location,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: palette.accent,
                              fontSize: 10.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (setting.briefing.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        setting.briefing,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: EngoraColors.muted,
                          fontSize: 13,
                          height: 1.25,
                        ),
                      ),
                    ],
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        AppSvgIcon(
                          AppIcons.voiceBot,
                          size: 17,
                          color: palette.accent,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            setting.aiCharacter.displayName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: palette.accent,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        CircleAvatar(
                          radius: 18,
                          backgroundColor: palette.accent,
                          child: const AppSvgIcon(
                            AppIcons.open,
                            color: Colors.white,
                            size: 18,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
