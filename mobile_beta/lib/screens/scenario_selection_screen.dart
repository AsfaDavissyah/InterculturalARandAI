import 'dart:async';

import 'package:flutter/material.dart';

import '../data/guided_topic_fallback.dart';
import '../models/guided_topic.dart';
import '../models/scenario_topic.dart';
import '../services/app_settings.dart';
import '../services/auth_service.dart';
import '../services/chat_service.dart';
import '../services/page_transitions.dart';
import '../theme/engora_theme.dart';
import '../widgets/app_svg_icon.dart';
import 'ar_speaking_screen.dart';
import 'guided_settings_screen.dart';
import 'practice_history_screen.dart';
import 'profile_screen.dart';

class ScenarioSelectionScreen extends StatefulWidget {
  const ScenarioSelectionScreen({super.key});

  @override
  State<ScenarioSelectionScreen> createState() =>
      _ScenarioSelectionScreenState();
}

class _ScenarioSelectionScreenState extends State<ScenarioSelectionScreen> {
  List<GuidedTopic> _guidedTopics = buildFallbackGuidedTopics();
  List<ScenarioTopic> _scenarios = scenarioTopics;
  int _selectedTab = 0;
  bool _loading = false;
  bool _guidedConnected = false;
  bool _legacyConnected = false;
  String _displayName = 'Student';

  bool get _fullyConnected => _guidedConnected && _legacyConnected;

  @override
  void initState() {
    super.initState();
    unawaited(_loadProfile());
    unawaited(_loadContent());
  }

  Future<void> _loadProfile() async {
    final profile = await AuthService.getProfile();
    if (mounted && profile != null) {
      setState(() => _displayName = profile.name);
    }
  }

  Future<void> _loadContent() async {
    if (mounted) setState(() => _loading = true);
    try {
      final service = ChatService(baseUrl: await AppSettings.getBaseUrl());
      final results = await Future.wait([
        _loadGuided(service),
        _loadLegacy(service),
      ]);
      if (mounted) {
        setState(() {
          _guidedConnected = results[0];
          _legacyConnected = results[1];
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _guidedConnected = false;
          _legacyConnected = false;
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<bool> _loadGuided(ChatService service) async {
    try {
      final topics = await service.getTopics();
      if (topics.isEmpty) return false;
      if (mounted) setState(() => _guidedTopics = topics);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> _loadLegacy(ChatService service) async {
    try {
      final scenarios = await service.getScenarios();
      if (scenarios.isEmpty) return false;
      if (mounted) setState(() => _scenarios = scenarios);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> _openProfile() async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const ProfileScreen()),
    );
    await _loadProfile();
  }

  void _openLegacyBriefing(ScenarioTopic scenario) {
    if (!scenario.isAvailable) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This scenario is not available yet.')),
      );
      return;
    }

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: EngoraColors.background,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) => SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(
            24,
            12,
            24,
            24 + MediaQuery.viewInsetsOf(sheetContext).bottom,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: EngoraColors.line,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(scenario.title, style: EngoraTheme.display(fontSize: 24)),
              const SizedBox(height: 8),
              Text(
                '${scenario.type}  •  ${scenario.level}',
                style: const TextStyle(
                  color: EngoraColors.brand,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 20),
              _BriefingLine(
                icon: Icons.location_on_outlined,
                label: 'Setting',
                value: scenario.arScene,
              ),
              _BriefingLine(
                icon: Icons.person_outline_rounded,
                label: 'Your role',
                value: scenario.studentRole,
              ),
              _BriefingLine(
                asset: AppIcons.voiceBot,
                label: 'AI partner',
                value: scenario.aiRole,
              ),
              _BriefingLine(
                asset: AppIcons.finish,
                label: 'Practice goal',
                value: scenario.taskInstruction,
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () {
                    Navigator.pop(sheetContext);
                    Navigator.push(
                      context,
                      SlideUpRoute(page: ArSpeakingScreen(scenario: scenario)),
                    );
                  },
                  icon: const AppSvgIcon(AppIcons.camera, size: 20),
                  label: const Text('Start Practice'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final firstName = _displayName.trim().split(RegExp(r'\s+')).first;
    final initial = firstName.isEmpty ? 'S' : firstName[0].toUpperCase();

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          color: EngoraColors.brand,
          onRefresh: _loadContent,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(24, 18, 24, 0),
                sliver: SliverToBoxAdapter(
                  child: Row(
                    children: [
                      InkWell(
                        onTap: _openProfile,
                        borderRadius: BorderRadius.circular(99),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 25,
                              backgroundColor: Colors.white,
                              child: Text(
                                initial,
                                style: const TextStyle(
                                  color: EngoraColors.brand,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 18,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'Hiii, $firstName',
                              style: const TextStyle(
                                color: EngoraColors.ink,
                                fontWeight: FontWeight.w600,
                                fontSize: 16,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      _HeaderAction(
                        tooltip: 'Practice history',
                        asset: AppIcons.history,
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const PracticeHistoryScreen(),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(24, 38, 24, 0),
                sliver: SliverToBoxAdapter(
                  child: Text(
                    'What Would You\nLike to Practice?',
                    style: EngoraTheme.display(fontSize: 31, height: 1.45),
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(24, 22, 24, 0),
                sliver: SliverToBoxAdapter(child: _buildTabs()),
              ),
              if (!_fullyConnected && !_loading)
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
                  sliver: SliverToBoxAdapter(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFECE8),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Row(
                        children: [
                          Icon(
                            Icons.cloud_off_outlined,
                            size: 18,
                            color: EngoraColors.danger,
                          ),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Some content is using the local backup. Pull down to reconnect.',
                              style: TextStyle(fontSize: 12.5),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
                sliver: _selectedTab == 0 ? _guidedList() : _scenarioLibrary(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTabs() {
    return Container(
      height: 52,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: EngoraColors.track,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          _tabButton(0, 'Guided Topics'),
          const SizedBox(width: 6),
          _tabButton(1, 'Scenario Library'),
        ],
      ),
    );
  }

  Widget _tabButton(int index, String label) {
    final active = _selectedTab == index;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedTab = index),
        borderRadius: BorderRadius.circular(10),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: active ? EngoraColors.brand : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: active ? Colors.white : EngoraColors.muted,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }

  SliverList _guidedList() {
    return SliverList.separated(
      itemCount: _guidedTopics.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final topic = _guidedTopics[index];
        final palette = TopicPalette.fromTopic(topic.topicId);
        return _TopicCard(
          topic: topic,
          palette: palette,
          onTap: () => Navigator.push(
            context,
            SlideUpRoute(page: GuidedSettingsScreen(topic: topic)),
          ),
        );
      },
    );
  }

  SliverList _scenarioLibrary() {
    return SliverList.separated(
      itemCount: _scenarios.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final scenario = _scenarios[index];
        final colors = const [
          TopicPalette(
            background: EngoraColors.academic,
            accent: EngoraColors.academicAccent,
            icon: Icons.school_outlined,
          ),
          TopicPalette(
            background: EngoraColors.social,
            accent: EngoraColors.socialAccent,
            icon: Icons.forum_outlined,
          ),
          TopicPalette(
            background: EngoraColors.professional,
            accent: EngoraColors.professionalAccent,
            icon: Icons.language_rounded,
          ),
        ];
        return _ScenarioCard(
          scenario: scenario,
          palette: colors[index % colors.length],
          onTap: () => _openLegacyBriefing(scenario),
        );
      },
    );
  }
}

class _HeaderAction extends StatelessWidget {
  final String tooltip;
  final String asset;
  final VoidCallback onTap;

  const _HeaderAction({
    required this.tooltip,
    required this.asset,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: tooltip,
      onPressed: onTap,
      icon: AppSvgIcon(asset, size: 24),
      style: IconButton.styleFrom(
        backgroundColor: Colors.white,
        foregroundColor: EngoraColors.ink,
        minimumSize: const Size(50, 50),
      ),
    );
  }
}

class _TopicCard extends StatelessWidget {
  final GuidedTopic topic;
  final TopicPalette palette;
  final VoidCallback onTap;

  const _TopicCard({
    required this.topic,
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
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 128),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: const BoxDecoration(
                    color: EngoraColors.background,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(palette.icon, color: palette.accent, size: 21),
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
                              topic.title,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 16,
                                height: 1.15,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 9,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              border: Border.all(color: palette.accent),
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: Text(
                              '2 Settings',
                              style: TextStyle(
                                color: palette.accent,
                                fontSize: 10.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        topic.description,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: EngoraColors.muted,
                          fontSize: 13,
                          height: 1.25,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Align(
                  alignment: Alignment.bottomRight,
                  child: CircleAvatar(
                    radius: 18,
                    backgroundColor: palette.accent,
                    child: const AppSvgIcon(
                      AppIcons.open,
                      color: Colors.white,
                      size: 18,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ScenarioCard extends StatelessWidget {
  final ScenarioTopic scenario;
  final TopicPalette palette;
  final VoidCallback onTap;

  const _ScenarioCard({
    required this.scenario,
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
            children: [
              CircleAvatar(
                radius: 23,
                backgroundColor: EngoraColors.background,
                child: Icon(palette.icon, color: palette.accent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      scenario.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      '${scenario.level}  •  ${scenario.arScene}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: EngoraColors.muted,
                        fontSize: 12.5,
                      ),
                    ),
                  ],
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
        ),
      ),
    );
  }
}

class _BriefingLine extends StatelessWidget {
  final IconData? icon;
  final String? asset;
  final String label;
  final String value;

  const _BriefingLine({
    this.icon,
    this.asset,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (asset != null)
            AppSvgIcon(asset!, color: EngoraColors.brand, size: 21)
          else
            Icon(icon, color: EngoraColors.brand, size: 21),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    color: EngoraColors.muted,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
