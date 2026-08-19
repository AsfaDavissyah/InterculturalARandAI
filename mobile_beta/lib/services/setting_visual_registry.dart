class SettingVisualSpec {
  final String stickerKey;
  final String fallbackKind;
  final String fallbackLabel;
  final String? assetPath;

  const SettingVisualSpec({
    required this.stickerKey,
    required this.fallbackKind,
    required this.fallbackLabel,
    this.assetPath,
  });

  bool get hasAsset => assetPath != null && assetPath!.isNotEmpty;
}

class SettingVisualRegistry {
  static const Map<String, SettingVisualSpec> _specs = {
    'sticker_lecturer_office': SettingVisualSpec(
      stickerKey: 'sticker_lecturer_office',
      fallbackKind: 'academic',
      fallbackLabel: 'Lecturer office',
      assetPath: 'assets/stickers/sticker_lecturer_office.png',
    ),
    'sticker_after_class': SettingVisualSpec(
      stickerKey: 'sticker_after_class',
      fallbackKind: 'academic',
      fallbackLabel: 'International classroom',
      assetPath: 'assets/stickers/sticker_after_class.png',
    ),
    'sticker_london_restaurant': SettingVisualSpec(
      stickerKey: 'sticker_london_restaurant',
      fallbackKind: 'restaurant',
      fallbackLabel: 'London restaurant',
      assetPath: 'assets/stickers/sticker_london_restaurant.png',
    ),
    'sticker_melbourne_cafe': SettingVisualSpec(
      stickerKey: 'sticker_melbourne_cafe',
      fallbackKind: 'cafe',
      fallbackLabel: 'Melbourne cafe',
      assetPath: 'assets/stickers/sticker_melbourne_cafe.png',
    ),
    'sticker_interview_room': SettingVisualSpec(
      stickerKey: 'sticker_interview_room',
      fallbackKind: 'professional',
      fallbackLabel: 'Interview room',
      assetPath: 'assets/stickers/sticker_interview_room.png',
    ),
    'sticker_career_fair': SettingVisualSpec(
      stickerKey: 'sticker_career_fair',
      fallbackKind: 'professional',
      fallbackLabel: 'International career fair',
      assetPath: 'assets/stickers/sticker_career_fair.png',
    ),
  };

  static SettingVisualSpec resolve(String stickerKey, {String label = ''}) {
    return _specs[stickerKey] ??
        SettingVisualSpec(
          stickerKey: stickerKey,
          fallbackKind: 'generic',
          fallbackLabel: label.isEmpty ? 'Practice setting' : label,
        );
  }

  static Set<String> get registeredKeys => _specs.keys.toSet();
}
