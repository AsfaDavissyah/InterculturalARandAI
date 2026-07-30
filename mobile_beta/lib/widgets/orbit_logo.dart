import 'package:flutter/material.dart';

/// Widget icon logo Orbit yang dirender menggunakan CustomPainter
/// sesuai dengan desain logo resmi (huruf O/Orbit dengan garis iris diagonal).
class OrbitLogo extends StatelessWidget {
  final double size;
  final Color color;
  final bool showBackground;
  final Color backgroundColor;
  final double borderRadius;

  const OrbitLogo({
    super.key,
    this.size = 48.0,
    this.color = Colors.white,
    this.showBackground = false,
    this.backgroundColor = Colors.black,
    this.borderRadius = 12.0,
  });

  @override
  Widget build(BuildContext context) {
    final logoWidget = SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: OrbitLogoPainter(color: color),
      ),
    );

    if (!showBackground) return logoWidget;

    return Container(
      width: size,
      height: size,
      padding: EdgeInsets.all(size * 0.16),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: [
          BoxShadow(
            color: backgroundColor.withValues(alpha: 0.25),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: CustomPaint(
        painter: OrbitLogoPainter(color: color),
      ),
    );
  }
}

class OrbitLogoPainter extends CustomPainter {
  final Color color;

  OrbitLogoPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final Paint paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill
      ..isAntiAlias = true;

    final double w = size.width;
    final double h = size.height;

    final double cx = w / 2;
    final double cy = h / 2;
    final double r = w * 0.42;
    final double innerR = w * 0.24;

    final Path orbitRing = Path();
    orbitRing.addOval(Rect.fromCircle(center: Offset(cx, cy), radius: r));

    final Path slashCut = Path();
    slashCut.moveTo(w * 0.08, h * 0.75);
    slashCut.lineTo(w * 0.92, h * 0.25);
    slashCut.lineTo(w * 0.88, h * 0.20);
    slashCut.lineTo(w * 0.04, h * 0.70);
    slashCut.close();

    final Path innerHole = Path();
    innerHole.addOval(Rect.fromCircle(center: Offset(cx, cy), radius: innerR));

    final Path mainLogo = Path.combine(
      PathOperation.difference,
      orbitRing,
      innerHole,
    );

    final Path outerCut = Path.combine(
      PathOperation.difference,
      mainLogo,
      slashCut,
    );

    final Path leftWing = Path();
    leftWing.moveTo(w * 0.05, h * 0.76);
    leftWing.cubicTo(w * 0.18, h * 0.70, w * 0.32, h * 0.60, w * 0.38, h * 0.56);
    leftWing.cubicTo(w * 0.26, h * 0.68, w * 0.14, h * 0.74, w * 0.05, h * 0.76);
    leftWing.close();

    final Path rightWing = Path();
    rightWing.moveTo(w * 0.95, h * 0.24);
    rightWing.cubicTo(w * 0.82, h * 0.30, w * 0.68, h * 0.40, w * 0.62, h * 0.44);
    rightWing.cubicTo(w * 0.74, h * 0.32, w * 0.86, h * 0.26, w * 0.95, h * 0.24);
    rightWing.close();

    final Path finalLogo = Path.combine(
      PathOperation.union,
      outerCut,
      Path.combine(PathOperation.union, leftWing, rightWing),
    );

    canvas.drawPath(finalLogo, paint);
  }

  @override
  bool shouldRepaint(covariant OrbitLogoPainter oldDelegate) =>
      oldDelegate.color != color;
}
