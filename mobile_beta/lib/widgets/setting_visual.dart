import 'package:flutter/material.dart';

import '../services/setting_visual_registry.dart';

class SettingVisual extends StatelessWidget {
  final String stickerKey;
  final String label;

  const SettingVisual({
    super.key,
    required this.stickerKey,
    required this.label,
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
        borderRadius: BorderRadius.circular(8),
        child: Image.asset(
          spec.assetPath!,
          width: double.infinity,
          height: 152,
          fit: BoxFit.cover,
        ),
      );
    }

    return Container(
      width: double.infinity,
      height: 152,
      decoration: BoxDecoration(
        color: const Color(0xFFF4EFE6),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            _iconFor(spec.fallbackKind),
            size: 42,
            color: const Color(0xFFD4842A),
          ),
          const SizedBox(height: 10),
          Text(
            spec.fallbackLabel,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}
