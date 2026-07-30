import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'screens/home_shell.dart';
import 'screens/login_screen.dart';
import 'services/auth_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final loggedIn = await AuthService.isLoggedIn();
  runApp(InterculturalAISpeakingBetaApp(isLoggedIn: loggedIn));
}

class InterculturalAISpeakingBetaApp extends StatefulWidget {
  final bool isLoggedIn;

  const InterculturalAISpeakingBetaApp({super.key, required this.isLoggedIn});

  @override
  State<InterculturalAISpeakingBetaApp> createState() =>
      InterculturalAISpeakingBetaAppState();

  static InterculturalAISpeakingBetaAppState of(BuildContext context) {
    return context.findAncestorStateOfType<InterculturalAISpeakingBetaAppState>()!;
  }
}

class InterculturalAISpeakingBetaAppState
    extends State<InterculturalAISpeakingBetaApp> {
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

  static const Color cream = Color(0xFFFFFCF4);
  static const Color black = Color(0xFF000000);
  static const Color slateDark = Color(0xFF0F172A);
  static const Color slateMedium = Color(0xFF1E293B);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Orbis',
      debugShowCheckedModeBanner: false,
      themeMode: _themeMode,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        scaffoldBackgroundColor: cream,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFD4842A),
          brightness: Brightness.light,
          surface: cream,
        ),
        textTheme: GoogleFonts.outfitTextTheme(
          ThemeData.light().textTheme,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: cream,
          foregroundColor: black,
          elevation: 0,
          scrolledUnderElevation: 0,
        ),
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: slateDark,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFD4842A),
          brightness: Brightness.dark,
          surface: slateMedium,
        ),
        textTheme: GoogleFonts.outfitTextTheme(
          ThemeData.dark().textTheme,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: slateDark,
          foregroundColor: Colors.white,
          elevation: 0,
          scrolledUnderElevation: 0,
        ),
      ),
      home: widget.isLoggedIn ? const HomeShell() : const LoginScreen(),
    );
  }
}
