import 'package:flutter/material.dart';

import '../models/guided_setting.dart';
import '../models/guided_topic.dart';
import '../services/app_settings.dart';
import '../services/chat_service.dart';
import '../services/page_transitions.dart';
import '../services/setting_sticker_registry.dart';
import 'guided_setting_briefing_screen.dart';

class GuidedSettingsScreen extends StatefulWidget {
  final GuidedTopic topic;

  const GuidedSettingsScreen({super.key, required this.topic});

  @override
  State<GuidedSettingsScreen> createState() => _GuidedSettingsScreenState();
}

class _GuidedSettingsScreenState extends State<GuidedSettingsScreen> {
  List<GuidedSetting> _settings = [];
  bool _loading = true;
  String? _errorMessage;

  static const Color _orange = Color(0xFFD4842A);

  @override
  void initState() {
    super.initState();
    _fetchSettings();
  }

  Future<void> _fetchSettings() async {
    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final baseUrl = await AppSettings.getBaseUrl();
      final chatService = ChatService(baseUrl: baseUrl);
      final list = await chatService.getSettingsForTopic(widget.topic.topicId);
      if (mounted) {
        setState(() {
          _settings = list;
          _loading = false;
        });
      }
    } catch (err) {
      if (mounted) {
        setState(() {
          _errorMessage = err.toString();
          _loading = false;
        });
      }
    }
  }

  void _openSettingBriefing(GuidedSetting setting) {
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
          widget.topic.title,
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
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Practice Settings',
                    style: TextStyle(
                      color: primaryColor,
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Choose a specific environment to begin immersive practice.',
                    style: TextStyle(
                      color: primaryColor.withValues(alpha: 0.6),
                      fontSize: 13.5,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(child: _buildBody(primaryColor, isDark)),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(Color primaryColor, bool isDark) {
    if (_loading) {
      return Center(
        child: CircularProgressIndicator(color: _orange, strokeWidth: 3),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.cloud_off_rounded,
                size: 48,
                color: Colors.red.shade400,
              ),
              const SizedBox(height: 16),
              Text(
                'Failed to load settings',
                style: TextStyle(
                  color: primaryColor,
                  fontWeight: FontWeight.w700,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: primaryColor.withValues(alpha: 0.6),
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _fetchSettings,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Try Again'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _orange,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (_settings.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.inbox_outlined,
              size: 48,
              color: primaryColor.withValues(alpha: 0.3),
            ),
            const SizedBox(height: 12),
            Text(
              'No settings available for this topic yet.',
              style: TextStyle(
                color: primaryColor.withValues(alpha: 0.6),
                fontSize: 14,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      itemCount: _settings.length,
      itemBuilder: (context, index) {
        final setting = _settings[index];
        return _buildSettingCard(context, setting, primaryColor, isDark);
      },
    );
  }

  Widget _buildSettingCard(
    BuildContext context,
    GuidedSetting setting,
    Color primaryColor,
    bool isDark,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade900 : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: primaryColor.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _openSettingBriefing(setting),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: _orange.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        setting.settingId,
                        style: const TextStyle(
                          color: _orange,
                          fontWeight: FontWeight.w800,
                          fontSize: 11,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ),
                    Icon(
                      Icons.arrow_forward_ios_rounded,
                      size: 14,
                      color: primaryColor.withValues(alpha: 0.3),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SettingStickerView(
                      stickerKey: setting.stickerAssetKey,
                      size: 52,
                      borderRadius: 12,
                      showShadow: true,
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            setting.title,
                            style: TextStyle(
                              color: primaryColor,
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Icon(
                                Icons.location_on_outlined,
                                size: 14,
                                color: primaryColor.withValues(alpha: 0.5),
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  setting.location,
                                  style: TextStyle(
                                    color: primaryColor.withValues(alpha: 0.6),
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w600,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (setting.briefing.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Text(
                    setting.briefing,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: primaryColor.withValues(alpha: 0.7),
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                Row(
                  children: [
                    Icon(
                      Icons.person_pin_circle_outlined,
                      size: 14,
                      color: primaryColor.withValues(alpha: 0.5),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'AI: ${setting.aiCharacter.displayName} (${setting.aiCharacter.role})',
                        style: TextStyle(
                          color: primaryColor.withValues(alpha: 0.6),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
