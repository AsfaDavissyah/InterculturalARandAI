import 'package:flutter/material.dart';

/// Registry and resolver for 2D Setting Stickers in Guided Practice Topics.
class SettingStickerRegistry {
  static const String prefix = 'assets/stickers/';

  static const Map<String, String> _stickerAssetMap = {
    'sticker_lecturer_office': '${prefix}sticker_lecturer_office.png',
    'academic_office_sticker': '${prefix}sticker_lecturer_office.png',
    'office_sticker': '${prefix}sticker_lecturer_office.png',

    'sticker_after_class': '${prefix}sticker_after_class.png',
    'campus_discussion_sticker': '${prefix}sticker_after_class.png',
    'after_class_sticker': '${prefix}sticker_after_class.png',

    'sticker_london_restaurant': '${prefix}sticker_london_restaurant.png',
    'restaurant_sticker': '${prefix}sticker_london_restaurant.png',
    'london_dining_sticker': '${prefix}sticker_london_restaurant.png',

    'sticker_melbourne_cafe': '${prefix}sticker_melbourne_cafe.png',
    'cafe_sticker': '${prefix}sticker_melbourne_cafe.png',
    'coffee_sticker': '${prefix}sticker_melbourne_cafe.png',

    'sticker_interview_room': '${prefix}sticker_interview_room.png',
    'interview_sticker': '${prefix}sticker_interview_room.png',
    'job_interview_sticker': '${prefix}sticker_interview_room.png',

    'sticker_career_fair': '${prefix}sticker_career_fair.png',
    'career_fair_sticker': '${prefix}sticker_career_fair.png',
    'networking_sticker': '${prefix}sticker_career_fair.png',
  };

  /// Returns the asset path for a given sticker key, or null if unmapped.
  static String? getAssetPath(String? stickerKey) {
    if (stickerKey == null || stickerKey.trim().isEmpty) return null;
    final normalized = stickerKey.trim().toLowerCase();
    return _stickerAssetMap[normalized];
  }

  /// Returns true if the sticker key exists in the registry.
  static bool hasSticker(String? stickerKey) {
    return getAssetPath(stickerKey) != null;
  }

  /// List of all canonical 6 setting sticker keys approved in PRD Phase 10.
  static const List<String> canonicalKeys = [
    'sticker_lecturer_office',
    'sticker_after_class',
    'sticker_london_restaurant',
    'sticker_melbourne_cafe',
    'sticker_interview_room',
    'sticker_career_fair',
  ];
}

/// Reusable widget for rendering a 2D setting sticker with smooth fallback.
class SettingStickerView extends StatelessWidget {
  final String? stickerKey;
  final double size;
  final double borderRadius;
  final bool showShadow;

  const SettingStickerView({
    super.key,
    required this.stickerKey,
    this.size = 64,
    this.borderRadius = 12,
    this.showShadow = false,
  });

  @override
  Widget build(BuildContext context) {
    final assetPath = SettingStickerRegistry.getAssetPath(stickerKey);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: showShadow
            ? [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.12),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: assetPath != null
            ? Image.asset(
                assetPath,
                width: size,
                height: size,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) =>
                    _buildFallback(context),
              )
            : _buildFallback(context),
      ),
    );
  }

  Widget _buildFallback(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFFD4842A).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: Icon(
        Icons.image_outlined,
        size: size * 0.5,
        color: const Color(0xFFD4842A),
      ),
    );
  }
}
