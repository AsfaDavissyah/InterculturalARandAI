import 'dart:math' as math;

import 'package:flutter/material.dart';

enum AvatarActivity { loading, idle, listening, thinking, speaking, error }

class ArAvatar extends StatefulWidget {
  final AvatarActivity activity;
  final String role;

  const ArAvatar({super.key, required this.activity, required this.role});

  @override
  State<ArAvatar> createState() => _ArAvatarState();
}

class _ArAvatarState extends State<ArAvatar>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    )..repeat();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'AI avatar, ${widget.activity.name}',
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return CustomPaint(
            painter: _AvatarPainter(
              activity: widget.activity,
              progress: _controller.value,
            ),
            child: const SizedBox(width: 230, height: 320),
          );
        },
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}

class _AvatarPainter extends CustomPainter {
  final AvatarActivity activity;
  final double progress;

  const _AvatarPainter({required this.activity, required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final pulse = (math.sin(progress * math.pi * 2) + 1) / 2;
    final bounce = activity == AvatarActivity.speaking
        ? math.sin(progress * math.pi * 2) * 2.5
        : math.sin(progress * math.pi * 2) * 1.2;
    final centerX = size.width / 2;

    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(centerX, size.height - 12),
        width: 132,
        height: 22,
      ),
      Paint()..color = Colors.black.withValues(alpha: 0.28),
    );

    canvas.save();
    canvas.translate(0, bounce);

    if (activity == AvatarActivity.listening) {
      canvas.drawCircle(
        Offset(centerX, 91),
        66 + (pulse * 9),
        Paint()
          ..color = const Color(0xFF36C5A5).withValues(alpha: 0.2)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 5,
      );
    }

    final shoePaint = Paint()..color = const Color(0xFF18252E);
    final trousersPaint = Paint()..color = const Color(0xFF263B48);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(centerX - 43, 225, 36, 78),
        const Radius.circular(12),
      ),
      trousersPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(centerX + 7, 225, 36, 78),
        const Radius.circular(12),
      ),
      trousersPaint,
    );
    canvas.drawOval(Rect.fromLTWH(centerX - 52, 291, 47, 18), shoePaint);
    canvas.drawOval(Rect.fromLTWH(centerX + 5, 291, 47, 18), shoePaint);

    final skinPaint = Paint()..color = const Color(0xFFD89B73);
    final shirtPaint = Paint()..color = const Color(0xFF137C76);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(centerX - 65, 137, 130, 105),
        const Radius.circular(31),
      ),
      shirtPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(centerX - 84, 150, 27, 92),
        const Radius.circular(14),
      ),
      shirtPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(centerX + 57, 150, 27, 92),
        const Radius.circular(14),
      ),
      shirtPaint,
    );
    canvas.drawCircle(Offset(centerX - 70, 241), 14, skinPaint);
    canvas.drawCircle(Offset(centerX + 70, 241), 14, skinPaint);

    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(centerX - 16, 116, 32, 31),
        const Radius.circular(10),
      ),
      skinPaint,
    );
    canvas.drawOval(
      Rect.fromCenter(center: Offset(centerX, 82), width: 106, height: 124),
      skinPaint,
    );

    final hairPaint = Paint()..color = const Color(0xFF202A32);
    final hairPath = Path()
      ..moveTo(centerX - 53, 74)
      ..quadraticBezierTo(centerX - 51, 18, centerX, 18)
      ..quadraticBezierTo(centerX + 56, 19, centerX + 54, 75)
      ..quadraticBezierTo(centerX + 30, 51, centerX + 13, 48)
      ..quadraticBezierTo(centerX - 15, 38, centerX - 53, 74)
      ..close();
    canvas.drawPath(hairPath, hairPaint);

    final eyePaint = Paint()..color = const Color(0xFF172126);
    canvas.drawOval(
      Rect.fromCenter(center: Offset(centerX - 20, 83), width: 9, height: 12),
      eyePaint,
    );
    canvas.drawOval(
      Rect.fromCenter(center: Offset(centerX + 20, 83), width: 9, height: 12),
      eyePaint,
    );

    final mouthHeight = activity == AvatarActivity.speaking
        ? 5.0 + (pulse * 15)
        : activity == AvatarActivity.error
        ? 3.0
        : 6.0;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: Offset(centerX, 113),
          width: 27,
          height: mouthHeight,
        ),
        const Radius.circular(8),
      ),
      Paint()..color = const Color(0xFF743E3E),
    );

    if (activity == AvatarActivity.thinking ||
        activity == AvatarActivity.loading) {
      for (var index = 0; index < 3; index++) {
        final active = ((progress * 3).floor() % 3) == index;
        canvas.drawCircle(
          Offset(centerX - 18 + (index * 18), 2),
          active ? 5.5 : 3.5,
          Paint()..color = Colors.white.withValues(alpha: active ? 0.95 : 0.55),
        );
      }
    }

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _AvatarPainter oldDelegate) {
    return oldDelegate.activity != activity || oldDelegate.progress != progress;
  }
}
