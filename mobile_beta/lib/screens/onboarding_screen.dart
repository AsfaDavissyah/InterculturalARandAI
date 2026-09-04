import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../theme/engora_theme.dart';

class OnboardingScreen extends StatefulWidget {
  final Widget destination;
  final Duration displayDuration;

  const OnboardingScreen({
    super.key,
    required this.destination,
    this.displayDuration = const Duration(milliseconds: 1700),
  });

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _opacity;
  late final Animation<double> _scale;
  Timer? _navigationTimer;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    );
    _opacity = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _scale = Tween<double>(
      begin: 0.94,
      end: 1,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));
    _controller.forward();
    _navigationTimer = Timer(widget.displayDuration, _continue);
  }

  void _continue() {
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      PageRouteBuilder<void>(
        transitionDuration: const Duration(milliseconds: 280),
        pageBuilder: (_, animation, secondaryAnimation) => widget.destination,
        transitionsBuilder: (_, animation, secondaryAnimation, child) {
          return FadeTransition(opacity: animation, child: child);
        },
      ),
    );
  }

  @override
  void dispose() {
    _navigationTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EngoraColors.background,
      body: Semantics(
        label: 'Engora',
        image: true,
        child: Center(
          child: FadeTransition(
            opacity: _opacity,
            child: ScaleTransition(
              scale: _scale,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SvgPicture.asset(
                    'assets/logo/engora_logo.svg',
                    width: 132,
                    height: 132,
                  ),
                  const SizedBox(height: 1),
                  const _EngoraWordmark(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _EngoraWordmark extends StatelessWidget {
  const _EngoraWordmark();

  @override
  Widget build(BuildContext context) {
    const style = TextStyle(
      fontFamily: 'Fredoka',
      fontSize: 25,
      fontWeight: FontWeight.w700,
      height: 1,
      letterSpacing: 0,
    );
    return const Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: 'Eng',
            style: TextStyle(color: EngoraColors.socialAccent),
          ),
          TextSpan(
            text: 'o',
            style: TextStyle(color: EngoraColors.brand),
          ),
          TextSpan(
            text: 'ra',
            style: TextStyle(color: EngoraColors.socialAccent),
          ),
        ],
      ),
      style: style,
    );
  }
}
