import 'package:flutter/material.dart';

import '../services/app_settings.dart';
import '../services/auth_service.dart';
import '../services/chat_service.dart';
import '../theme/engora_theme.dart';
import '../widgets/app_svg_icon.dart';
import 'login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  UserProfile? _profile;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final profile = await AuthService.getProfile();
    if (mounted) setState(() => _profile = profile);
  }

  Future<void> _editProfile() async {
    final profile = _profile;
    if (profile == null) return;
    final nameController = TextEditingController(text: profile.name);
    var gender = profile.gender;
    var saving = false;

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Edit profile'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                enabled: !saving,
                decoration: const InputDecoration(labelText: 'Full name'),
              ),
              const SizedBox(height: 12),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'male', label: Text('Male')),
                  ButtonSegment(value: 'female', label: Text('Female')),
                ],
                selected: {gender},
                onSelectionChanged: saving
                    ? null
                    : (value) => setDialogState(() => gender = value.first),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: saving ? null : () => Navigator.pop(dialogContext),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: saving
                  ? null
                  : () async {
                      final name = nameController.text.trim();
                      if (name.length < 3) return;
                      setDialogState(() => saving = true);
                      final success = await AuthService.updateProfile(
                        name: name,
                        gender: gender,
                      );
                      if (!mounted || !dialogContext.mounted) return;
                      if (success) {
                        Navigator.pop(dialogContext);
                        await _loadProfile();
                      } else {
                        setDialogState(() => saving = false);
                        ScaffoldMessenger.of(this.context).showSnackBar(
                          const SnackBar(
                            content: Text('Could not update profile.'),
                          ),
                        );
                      }
                    },
              child: saving
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : const Text('Save'),
            ),
          ],
        ),
      ),
    );
    nameController.dispose();
  }

  Future<void> _serverSettings() async {
    final currentUrl = await AppSettings.getBaseUrl();
    if (!mounted) return;
    final controller = TextEditingController(text: currentUrl);
    var testing = false;
    String? status;
    final result = await showDialog<String>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Server connection'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: controller,
                enabled: !testing,
                decoration: const InputDecoration(labelText: 'Backend address'),
              ),
              if (status != null) ...[
                const SizedBox(height: 10),
                Text(
                  status!,
                  style: TextStyle(
                    color: status == 'Connected'
                        ? EngoraColors.brand
                        : EngoraColors.danger,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: testing
                  ? null
                  : () async {
                      setDialogState(() {
                        testing = true;
                        status = null;
                      });
                      try {
                        final url = AppSettings.normalizeBaseUrl(
                          controller.text,
                        );
                        await ChatService(baseUrl: url).checkConnection();
                        setDialogState(() => status = 'Connected');
                      } catch (_) {
                        setDialogState(() => status = 'Cannot connect');
                      } finally {
                        setDialogState(() => testing = false);
                      }
                    },
              child: const Text('Test'),
            ),
            TextButton(
              onPressed: testing ? null : () => Navigator.pop(dialogContext),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: testing
                  ? null
                  : () => Navigator.pop(dialogContext, controller.text.trim()),
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
    controller.dispose();
    if (result != null && result.isNotEmpty) {
      await AppSettings.setBaseUrl(result);
    }
  }

  Future<void> _pilotSettings() async {
    final current = await AppSettings.getPilotTestContext();
    if (!mounted) return;
    final deviceController = TextEditingController(text: current.deviceLabel);
    var network = current.networkProfile;
    var install = current.installType;
    final saved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Pilot test context'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: deviceController,
                  decoration: const InputDecoration(labelText: 'Device label'),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: network,
                  decoration: const InputDecoration(
                    labelText: 'Network profile',
                  ),
                  items: const [
                    DropdownMenuItem(
                      value: 'unreported',
                      child: Text('Not specified'),
                    ),
                    DropdownMenuItem(
                      value: 'approved_wifi',
                      child: Text('Approved Wi-Fi'),
                    ),
                    DropdownMenuItem(
                      value: 'mobile_data',
                      child: Text('Mobile data'),
                    ),
                    DropdownMenuItem(
                      value: 'slow_network',
                      child: Text('Slower network'),
                    ),
                  ],
                  onChanged: (value) =>
                      setDialogState(() => network = value ?? 'unreported'),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: install,
                  decoration: const InputDecoration(labelText: 'Install type'),
                  items: const [
                    DropdownMenuItem(
                      value: 'unreported',
                      child: Text('Not specified'),
                    ),
                    DropdownMenuItem(
                      value: 'debug_apk',
                      child: Text('Debug APK'),
                    ),
                    DropdownMenuItem(
                      value: 'release_apk',
                      child: Text('Release APK'),
                    ),
                    DropdownMenuItem(
                      value: 'play_store',
                      child: Text('Play Store'),
                    ),
                  ],
                  onChanged: (value) =>
                      setDialogState(() => install = value ?? 'unreported'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
    if (saved == true) {
      await AppSettings.setPilotTestContext(
        PilotTestContext(
          deviceLabel: deviceController.text,
          networkProfile: network,
          installType: install,
        ),
      );
    }
    deviceController.dispose();
  }

  Future<void> _logout() async {
    await AuthService.logout();
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final profile = _profile;
    final initial = (profile?.name.isNotEmpty ?? false)
        ? profile!.name[0].toUpperCase()
        : 'S';
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: 'Back',
          onPressed: () => Navigator.pop(context),
          icon: const AppSvgIcon(AppIcons.back, size: 24),
        ),
        title: const Text('Profile'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
        children: [
          Center(
            child: CircleAvatar(
              radius: 38,
              backgroundColor: EngoraColors.brand,
              child: Text(
                initial,
                style: EngoraTheme.display(fontSize: 27, color: Colors.white),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            profile?.name ?? 'Student',
            textAlign: TextAlign.center,
            style: EngoraTheme.display(fontSize: 22),
          ),
          const SizedBox(height: 4),
          Text(
            profile?.email ?? '',
            textAlign: TextAlign.center,
            style: const TextStyle(color: EngoraColors.muted),
          ),
          const SizedBox(height: 28),
          _ProfileTile(
            icon: Icons.person_outline_rounded,
            title: 'Personal information',
            subtitle: 'Update your name and gender',
            onTap: _editProfile,
          ),
          _ProfileTile(
            icon: Icons.school_outlined,
            title: 'Student information',
            subtitle:
                '${profile?.studentId ?? '-'}  •  ${profile?.studentLecturerCode ?? '-'}',
          ),
          _ProfileTile(
            icon: Icons.dns_outlined,
            title: 'Server connection',
            subtitle: 'Configure and test the API server',
            onTap: _serverSettings,
          ),
          _ProfileTile(
            icon: Icons.science_outlined,
            title: 'Pilot test context',
            subtitle: 'Device, network, and installation details',
            onTap: _pilotSettings,
          ),
          const SizedBox(height: 20),
          OutlinedButton.icon(
            onPressed: _logout,
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Logout'),
            style: OutlinedButton.styleFrom(
              foregroundColor: EngoraColors.danger,
              side: const BorderSide(color: EngoraColors.danger),
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  const _ProfileTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        child: ListTile(
          onTap: onTap,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          leading: Icon(icon, color: EngoraColors.brand),
          title: Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          subtitle: Text(subtitle),
          trailing: onTap == null
              ? null
              : const Icon(
                  Icons.chevron_right_rounded,
                  color: EngoraColors.muted,
                ),
        ),
      ),
    );
  }
}
