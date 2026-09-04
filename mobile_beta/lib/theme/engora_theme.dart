import 'package:flutter/material.dart';

abstract final class EngoraColors {
  static const background = Color(0xFFFFF9F3);
  static const ink = Color(0xFF242321);
  static const muted = Color(0xFF756F69);
  static const line = Color(0xFFD8D2CA);
  static const track = Color(0xFFE8E3DD);
  static const brand = Color(0xFF245B5A);
  static const brandPressed = Color(0xFF193F3E);
  static const danger = Color(0xFFC94F45);

  static const academic = Color(0xFFD9EEF5);
  static const academicAccent = Color(0xFF35879B);
  static const social = Color(0xFFF7DCCF);
  static const socialAccent = Color(0xFFDD6048);
  static const professional = Color(0xFFDDE9D8);
  static const professionalAccent = Color(0xFF5D8564);
}

abstract final class EngoraTheme {
  static TextStyle display({
    double fontSize = 32,
    Color color = EngoraColors.ink,
    double height = 1.2,
  }) {
    return TextStyle(
      fontFamily: 'OtomanopeeOne',
      fontSize: fontSize,
      color: color,
      height: height,
      fontWeight: FontWeight.w400,
      letterSpacing: 0,
    );
  }

  static ThemeData light() {
    final base = ThemeData.light(useMaterial3: true);
    final textTheme = base.textTheme.apply(
      fontFamily: 'Fredoka',
      bodyColor: EngoraColors.ink,
      displayColor: EngoraColors.ink,
    );

    return base.copyWith(
      scaffoldBackgroundColor: EngoraColors.background,
      colorScheme: ColorScheme.fromSeed(
        seedColor: EngoraColors.brand,
        brightness: Brightness.light,
        primary: EngoraColors.brand,
        surface: EngoraColors.background,
        error: EngoraColors.danger,
      ),
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: EngoraColors.background,
        foregroundColor: EngoraColors.ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleTextStyle: const TextStyle(
          fontFamily: 'Fredoka',
          color: EngoraColors.ink,
          fontSize: 17,
          fontWeight: FontWeight.w600,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        hintStyle: const TextStyle(
          fontFamily: 'Fredoka',
          color: EngoraColors.muted,
        ),
        labelStyle: const TextStyle(
          fontFamily: 'Fredoka',
          color: EngoraColors.muted,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: EngoraColors.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: EngoraColors.brand, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: EngoraColors.danger),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: EngoraColors.danger, width: 1.6),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 52),
          backgroundColor: EngoraColors.brand,
          foregroundColor: Colors.white,
          disabledBackgroundColor: const Color(0xFFCAC5BE),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Fredoka',
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? EngoraColors.brand
              : Colors.transparent,
        ),
        side: const BorderSide(color: EngoraColors.muted),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(3)),
      ),
    );
  }
}

class TopicPalette {
  final Color background;
  final Color accent;
  final IconData icon;

  const TopicPalette({
    required this.background,
    required this.accent,
    required this.icon,
  });

  static TopicPalette fromTopic(String value) {
    final normalized = value.toLowerCase();
    if (normalized.contains('social')) {
      return const TopicPalette(
        background: EngoraColors.social,
        accent: EngoraColors.socialAccent,
        icon: Icons.forum_outlined,
      );
    }
    if (normalized.contains('professional')) {
      return const TopicPalette(
        background: EngoraColors.professional,
        accent: EngoraColors.professionalAccent,
        icon: Icons.work_outline_rounded,
      );
    }
    return const TopicPalette(
      background: EngoraColors.academic,
      accent: EngoraColors.academicAccent,
      icon: Icons.school_outlined,
    );
  }
}
