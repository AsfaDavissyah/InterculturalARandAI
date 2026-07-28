import 'dart:async';


import 'package:flutter/material.dart';

import '../models/scenario_topic.dart';
import '../services/app_settings.dart';
import '../services/chat_service.dart';
import '../services/auth_service.dart';
import 'ar_speaking_screen.dart';
import 'login_screen.dart';
import 'onboarding_screen.dart';
import '../main.dart';
import '../services/page_transitions.dart';

class ScenarioSelectionScreen extends StatefulWidget {
  const ScenarioSelectionScreen({super.key});

  @override
  State<ScenarioSelectionScreen> createState() =>
      _ScenarioSelectionScreenState();
}

class _ScenarioSelectionScreenState extends State<ScenarioSelectionScreen> {
  List<ScenarioTopic> _scenarios = scenarioTopics;
  bool _refreshing = false;
  bool _connected = false;

  // Controller for stacked card scrolling
  late PageController _pageController;
  double _currentPage = 0.0;

  static const Color _cream = Color(0xFFFFFCF4);
  static const Color _black = Color(0xFF000000);
  static const Color _orange = Color(0xFFD4842A);

  String _displayName = 'Student';
  String _displayEmail = '';
  String _displayGender = 'female';

  @override
  void initState() {
    super.initState();
    _pageController = PageController(viewportFraction: 0.88)
      ..addListener(() {
        if (mounted) {
          setState(() {
            _currentPage = _pageController.page ?? 0.0;
          });
        }
      });
    _loadUserProfile();
    unawaited(_loadScenarios());
  }

  Future<void> _loadUserProfile() async {
    final profile = await AuthService.getProfile();
    if (profile != null && mounted) {
      setState(() {
        _displayName = profile.name;
        _displayEmail = profile.email;
        _displayGender = profile.gender;
      });
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _loadScenarios() async {
    if (mounted) setState(() => _refreshing = true);
    try {
      final baseUrl = await AppSettings.getBaseUrl();
      final scenarios = await ChatService(baseUrl: baseUrl).getScenarios();
      if (!mounted) return;
      setState(() {
        if (scenarios.isNotEmpty) _scenarios = scenarios;
        _connected = true;
      });
    } catch (_) {
      if (mounted) setState(() => _connected = false);
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  void _openScenario(BuildContext context, ScenarioTopic scenario) {
    if (!scenario.isAvailable) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("This scenario is not connected to the backend yet."),
        ),
      );
      return;
    }

    Navigator.push(
      context,
      SlideUpRoute(
        page: ArSpeakingScreen(scenario: scenario),
      ),
    );
  }

  Future<void> _openBackendSettings() async {
    final currentUrl = await AppSettings.getBaseUrl();
    if (!mounted) return;
    final controller = TextEditingController(text: currentUrl);
    String? connectionMessage;
    bool checking = false;

    final newUrl = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            Future<void> checkConnection() async {
              setDialogState(() {
                checking = true;
                connectionMessage = null;
              });
              try {
                final url = AppSettings.normalizeBaseUrl(controller.text);
                await ChatService(baseUrl: url).checkConnection();
                setDialogState(() => connectionMessage = 'Connected ✓');
              } catch (_) {
                setDialogState(() => connectionMessage = 'Cannot connect');
              } finally {
                setDialogState(() => checking = false);
              }
            }

            return PopScope(
              canPop: !checking,
              child: AlertDialog(
                backgroundColor: _cream,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                title: const Text(
                  'Backend Address',
                  style: TextStyle(
                    color: _black,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      controller: controller,
                      enabled: !checking,
                      keyboardType: TextInputType.url,
                      autocorrect: false,
                      style: const TextStyle(color: _black),
                      decoration: InputDecoration(
                        hintText: 'http://192.168.1.8:3000',
                        hintStyle: TextStyle(color: _black.withValues(alpha: 0.3)),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                    if (connectionMessage != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        connectionMessage!,
                        style: TextStyle(
                          color: connectionMessage!.contains('✓')
                              ? Colors.green.shade700
                              : Colors.red.shade700,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ],
                ),
                actions: [
                  TextButton.icon(
                    onPressed: checking ? null : checkConnection,
                    icon: checking
                        ? const SizedBox.square(
                            dimension: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.wifi_tethering_rounded),
                    label: const Text('Test'),
                  ),
                  TextButton(
                    onPressed: checking ? null : () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  FilledButton(
                    onPressed: checking
                        ? null
                        : () => Navigator.pop(context, controller.text),
                    style: FilledButton.styleFrom(
                      backgroundColor: _orange,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Save'),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
    WidgetsBinding.instance.addPostFrameCallback((_) => controller.dispose());
    if (newUrl == null || newUrl.trim().isEmpty) return;
    await AppSettings.setBaseUrl(newUrl);
    await _loadScenarios();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.brightness == Brightness.dark ? Colors.white : Colors.black;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── Header: Profile + Greeting ───
            _buildHeader(),

            if (!_connected && !_refreshing)
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, color: Colors.red, size: 20),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Connection failed. Using offline backup. Tap the cloud icon to retry.',
                          style: TextStyle(
                            color: Colors.red.shade800,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            const SizedBox(height: 20),

            // ─── Headline ───
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                'Welcome to\nOrbis',
                style: TextStyle(
                  color: primaryColor,
                  fontSize: 34,
                  fontWeight: FontWeight.w800,
                  height: 1.15,
                  letterSpacing: -0.5,
                ),
              ),
            ),

            const SizedBox(height: 28),

            // ─── Stacked Scenario Cards ───
            Expanded(
              child: _scenarios.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : _buildStackedCards(),
            ),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  void _openEditProfileDialog() async {
    final nameController = TextEditingController(text: _displayName);
    String tempGender = _displayGender;
    bool saving = false;

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? Colors.white : Colors.black;

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return PopScope(
              canPop: !saving,
              child: AlertDialog(
                backgroundColor: theme.scaffoldBackgroundColor,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: primaryColor, width: 1.5),
                ),
                title: Text(
                  'Edit Profile',
                  style: TextStyle(
                    color: primaryColor,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Name Field
                    TextField(
                      controller: nameController,
                      enabled: !saving,
                      style: TextStyle(color: primaryColor),
                      decoration: InputDecoration(
                        labelText: 'Full Name',
                        labelStyle: TextStyle(color: primaryColor.withValues(alpha: 0.6)),
                        enabledBorder: OutlineInputBorder(
                          borderSide: BorderSide(color: primaryColor, width: 1.5),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderSide: const BorderSide(color: _orange, width: 2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'Gender',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: primaryColor.withValues(alpha: 0.8),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        // Male option
                        Expanded(
                          child: GestureDetector(
                            onTap: saving ? null : () => setDialogState(() => tempGender = 'male'),
                            child: Container(
                              height: 46,
                              decoration: BoxDecoration(
                                color: tempGender == 'male' ? _orange : Colors.transparent,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: primaryColor, width: 1.5),
                              ),
                              child: Center(
                                child: Text(
                                  'Laki-laki',
                                  style: TextStyle(
                                    color: tempGender == 'male' ? Colors.white : primaryColor,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Female option
                        Expanded(
                          child: GestureDetector(
                            onTap: saving ? null : () => setDialogState(() => tempGender = 'female'),
                            child: Container(
                              height: 46,
                              decoration: BoxDecoration(
                                color: tempGender == 'female' ? _orange : Colors.transparent,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: primaryColor, width: 1.5),
                              ),
                              child: Center(
                                child: Text(
                                  'Perempuan',
                                  style: TextStyle(
                                    color: tempGender == 'female' ? Colors.white : primaryColor,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                actions: [
                  TextButton(
                    onPressed: saving ? null : () => Navigator.pop(context),
                    child: Text('Cancel', style: TextStyle(color: primaryColor.withValues(alpha: 0.6))),
                  ),
                  FilledButton(
                    onPressed: saving
                        ? null
                        : () async {
                            final newName = nameController.text.trim();
                            if (newName.isEmpty) return;

                            setDialogState(() => saving = true);
                            final success = await AuthService.updateProfile(
                              name: newName,
                              gender: tempGender,
                            );

                            if (success) {
                              await _loadUserProfile();
                            }
                            if (context.mounted) {
                              Navigator.pop(context);
                            }
                          },
                    style: FilledButton.styleFrom(
                      backgroundColor: primaryColor,
                      foregroundColor: theme.scaffoldBackgroundColor,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                    child: saving
                        ? const SizedBox.square(
                            dimension: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('Save', style: TextStyle(fontWeight: FontWeight.w800)),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
    nameController.dispose();
  }

  void _openProfileDetails() {
    final theme = Theme.of(context);
    final appState = InterculturalAISpeakingBetaApp.of(context);

    // Initial letter calculation
    final initialLetter = _displayName.isNotEmpty ? _displayName[0].toUpperCase() : 'S';

    showModalBottomSheet(
      context: context,
      backgroundColor: theme.scaffoldBackgroundColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final currentIsDark = Theme.of(context).brightness == Brightness.dark;
            
            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        // Beautiful Gradient Initial Avatar
                        Container(
                          width: 54,
                          height: 54,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: LinearGradient(
                              colors: [Color(0xFFD4842A), Color(0xFFF2994A)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                          ),
                          child: Center(
                            child: Text(
                              initialLetter,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 24,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _displayName,
                                style: TextStyle(
                                  color: currentIsDark ? Colors.white : Colors.black,
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              Text(
                                _displayEmail,
                                style: TextStyle(
                                  color: (currentIsDark ? Colors.white : Colors.black).withValues(alpha: 0.6),
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Divider(color: currentIsDark ? Colors.white24 : const Color(0xFFE8E2D8)),
                    const SizedBox(height: 8),
                    
                    // Edit Profile Menu
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(Icons.edit_outlined, color: currentIsDark ? Colors.white : Colors.black),
                      title: Text(
                        'Edit Profile',
                        style: TextStyle(
                          color: currentIsDark ? Colors.white : Colors.black,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      subtitle: const Text('Update name and gender'),
                      onTap: () {
                        Navigator.pop(context);
                        _openEditProfileDialog();
                      },
                    ),

                    // Dark Mode Switch Menu
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(
                        currentIsDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                        color: currentIsDark ? Colors.white : Colors.black,
                      ),
                      title: Text(
                        'Dark Mode',
                        style: TextStyle(
                          color: currentIsDark ? Colors.white : Colors.black,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      subtitle: const Text('Toggle between dark and light themes'),
                      trailing: Switch(
                        value: currentIsDark,
                        activeTrackColor: _orange,
                        activeThumbColor: Colors.white,
                        onChanged: (value) async {
                          await appState.toggleTheme(value);
                          setSheetState(() {});
                        },
                      ),
                    ),

                    // Onboarding & Guide option
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(Icons.help_outline_rounded, color: currentIsDark ? Colors.white : Colors.black),
                      title: Text(
                        'Panduan & Onboarding',
                        style: TextStyle(
                          color: currentIsDark ? Colors.white : Colors.black,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      subtitle: const Text('Petunjuk izin kamera, mic, & cara latihan'),
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const OnboardingScreen()),
                        );
                      },
                    ),

                    // Settings option
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(Icons.settings_ethernet_rounded, color: currentIsDark ? Colors.white : Colors.black),
                      title: Text(
                        'Backend Server Settings',
                        style: TextStyle(
                          color: currentIsDark ? Colors.white : Colors.black,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      subtitle: const Text('Configure API server address'),
                      onTap: () {
                        Navigator.pop(context);
                        _openBackendSettings();
                      },
                    ),
                    const SizedBox(height: 16),
                    
                    // Logout button
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          final navigator = Navigator.of(context);
                          await AuthService.logout();
                          navigator.pushAndRemoveUntil(
                            MaterialPageRoute(builder: (context) => const LoginScreen()),
                            (route) => false,
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.red, width: 1.5),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(26),
                          ),
                          foregroundColor: Colors.red,
                        ),
                        icon: const Icon(Icons.logout_rounded, size: 20),
                        label: const Text(
                          'LOGOUT',
                          style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1.0),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildHeader() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? Colors.white : Colors.black;
    final initialLetter = _displayName.isNotEmpty ? _displayName[0].toUpperCase() : 'S';

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
      child: Row(
        children: [
          // Profile circle — tap to open details, long press opens settings
          GestureDetector(
            onTap: _openProfileDetails,
            onLongPress: _openBackendSettings,
            child: Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(
                  colors: [Color(0xFFD4842A), Color(0xFFF2994A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                border: Border.all(
                  color: primaryColor.withValues(alpha: 0.15),
                  width: 1.5,
                ),
              ),
              child: Center(
                child: Text(
                  initialLetter,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'Hello, $_displayName',
            style: TextStyle(
              color: primaryColor.withValues(alpha: 0.75),
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
          const Spacer(),
          // Connection & refresh indicators (subtle)
          if (_refreshing)
            const SizedBox.square(
              dimension: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else
            GestureDetector(
              onTap: _loadScenarios,
              child: Icon(
                _connected ? Icons.cloud_done_rounded : Icons.cloud_off_rounded,
                color: _connected
                    ? primaryColor.withValues(alpha: 0.3)
                    : Colors.red.withValues(alpha: 0.5),
                size: 20,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStackedCards() {
    return PageView.builder(
      controller: _pageController,
      itemCount: _scenarios.length,
      physics: const BouncingScrollPhysics(),
      clipBehavior: Clip.none,
      itemBuilder: (context, index) {
        return _buildScenarioCard(index, _scenarios[index]);
      },
    );
  }

  Widget _buildScenarioCard(int index, ScenarioTopic scenario) {
    // Calculate transform values for stacked effect
    double diff = (index - _currentPage);

    // Scale: active card is full size, others are slightly smaller
    double scale = 1.0 - (diff.abs() * 0.05).clamp(0.0, 0.15);

    // Vertical offset: cards behind shift downward to create stacked look
    double translateY = diff.abs() * 16;

    // Opacity: fade cards that are further away
    double opacity = (1.0 - diff.abs() * 0.3).clamp(0.0, 1.0);

    // Slight rotation for depth effect
    double rotateZ = diff * 0.02;

    return Opacity(
      opacity: opacity,
      child: Transform.translate(
        offset: Offset(0, translateY),
        child: Transform.scale(
          scale: scale,
          alignment: Alignment.bottomCenter,
          child: Transform.rotate(
            angle: rotateZ,
            child: GestureDetector(
              onTap: () => _openScenario(context, scenario),
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                decoration: BoxDecoration(
                  color: _orange,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: _orange.withValues(alpha: 0.25),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: Stack(
                    children: [
                      // Subtle decorative circles in background
                      Positioned(
                        right: -30,
                        bottom: -30,
                        child: Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white.withValues(alpha: 0.08),
                          ),
                        ),
                      ),
                      Positioned(
                        left: -20,
                        top: -20,
                        child: Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white.withValues(alpha: 0.05),
                          ),
                        ),
                      ),
                      // Card Content
                      Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Scenario ID badge
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                scenario.id,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 11,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),

                            // Title
                            Text(
                              scenario.title,
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                                height: 1.25,
                              ),
                            ),
                            const SizedBox(height: 12),

                            // Description
                            Expanded(
                              child: Text(
                                scenario.taskInstruction,
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.85),
                                  fontSize: 14,
                                  height: 1.5,
                                ),
                              ),
                            ),

                            const SizedBox(height: 12),

                            // Bottom info row
                            Row(
                              children: [
                                _InfoChip(
                                  label: scenario.type,
                                  color: Colors.white,
                                ),
                                const SizedBox(width: 8),
                                _InfoChip(
                                  label: scenario.level,
                                  color: Colors.white,
                                ),
                                const Spacer(),
                                // Status indicator
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: scenario.isAvailable
                                        ? Colors.white
                                        : Colors.white.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                  child: Text(
                                    scenario.isAvailable ? 'Ready' : 'Soon',
                                    style: TextStyle(
                                      color: scenario.isAvailable
                                          ? _orange
                                          : Colors.white.withValues(alpha: 0.7),
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12,
                                    ),
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
            ),
          ),
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final String label;
  final Color color;

  const _InfoChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: color.withValues(alpha: 0.9),
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}
