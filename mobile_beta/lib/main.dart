import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'screens/home_shell.dart';
import 'screens/login_screen.dart';
import 'screens/onboarding_screen.dart';
import 'services/auth_service.dart';
import 'theme/engora_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final loggedIn = await AuthService.isLoggedIn();
  runApp(EngoraApp(isLoggedIn: loggedIn));
}

class EngoraApp extends StatefulWidget {
  final bool isLoggedIn;

  const EngoraApp({super.key, required this.isLoggedIn});

  @override
  State<EngoraApp> createState() => EngoraAppState();

  static EngoraAppState of(BuildContext context) {
    return context.findAncestorStateOfType<EngoraAppState>()!;
  }
}

class EngoraAppState extends State<EngoraApp> {
  ThemeMode _themeMode = ThemeMode.light;

  ThemeMode get themeMode => _themeMode;

  @override
  void initState() {
    super.initState();
    _loadThemeMode();
  }

  Future<void> _loadThemeMode() async {
    final prefs = await SharedPreferences.getInstance();
    final isDark = prefs.getBool('app_theme_dark') ?? false;
    if (mounted) {
      setState(() {
        _themeMode = isDark ? ThemeMode.dark : ThemeMode.light;
      });
    }
  }

  Future<void> toggleTheme(bool isDark) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('app_theme_dark', isDark);
    setState(() {
      _themeMode = isDark ? ThemeMode.dark : ThemeMode.light;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Engora',
      debugShowCheckedModeBanner: false,
      themeMode: _themeMode,
      theme: EngoraTheme.light(),
      darkTheme: EngoraTheme.light(),
      home: OnboardingScreen(
        destination: widget.isLoggedIn
            ? const HomeShell()
            : const LoginScreen(),
      ),
    );
  }
}
