import 'package:flutter/material.dart';

import '../services/setting_visual_registry.dart';
import '../theme/engora_theme.dart';

class SettingVisual extends StatelessWidget {
  final String stickerKey;
  final String label;
  final double height;
  final double? width;
  final double borderRadius;
  final bool showLabel;
  final Color backgroundColor;
  final Color iconColor;

  const SettingVisual({
    super.key,
    required this.stickerKey,
    required this.label,
    this.height = 152,
    this.width,
    this.borderRadius = 8,
    this.showLabel = true,
    this.backgroundColor = const Color(0xFFF4EFE6),
    this.iconColor = EngoraColors.brand,
  });

  IconData _iconFor(String kind) => switch (kind) {
    'academic' => Icons.school_outlined,
    'restaurant' => Icons.restaurant_outlined,
    'cafe' => Icons.local_cafe_outlined,
    'professional' => Icons.business_center_outlined,
    _ => Icons.place_outlined,
  };

  @override
  Widget build(BuildContext context) {
    final spec = SettingVisualRegistry.resolve(stickerKey, label: label);
    if (spec.hasAsset) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: Image.asset(
          spec.assetPath!,
          width: width ?? double.infinity,
          height: height,
          fit: BoxFit.cover,
        ),
      );
    }

    return Container(
      width: width ?? double.infinity,
      height: height,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            _iconFor(spec.fallbackKind),
            size: showLabel ? 42 : 38,
            color: iconColor,
          ),
          if (showLabel) ...[
            const SizedBox(height: 10),
            Text(
              spec.fallbackLabel,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
          ],
        ],
      ),
    );
  }
}
