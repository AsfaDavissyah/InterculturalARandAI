class AvatarRegistry {
  static const String femalePrototype = 'assets/models/female_char.glb';
  static const String malePrototype = 'assets/models/male_char.glb';
  static const String olivia = 'assets/models/olivia_animated.glb';
  static const String sarah = 'assets/models/sarah_animated.glb';
  static const String drEmma = 'assets/models/dr_emma_animated.glb';
  static const String hr = 'assets/models/hr_animated.glb';

  static const Map<String, String> _prototypeByKey = {
    'female_lecturer_v1': drEmma,
    'waitress_v1': sarah,
    'barista_v1': olivia,
    'hr_manager_v1': hr,
    'dr_emma': drEmma,
    'sarah_bennett': sarah,
    'olivia_reed': olivia,
    'michael_harris': hr,
  };

  static String modelPathFor({String? avatarKey, String aiRole = ''}) {
    final normalizedKey = avatarKey?.trim().toLowerCase() ?? '';
    final registeredPath = _prototypeByKey[normalizedKey];
    if (registeredPath != null) return registeredPath;

    final normalizedRole = aiRole.toLowerCase();
    final identifiesMaleRole =
        normalizedRole.contains('male') && !normalizedRole.contains('female');
    if (identifiesMaleRole ||
        normalizedRole.contains('mr.') ||
        normalizedRole.contains('manager') ||
        normalizedRole.contains('michael') ||
        normalizedRole.contains('david')) {
      return malePrototype;
    }
    return femalePrototype;
  }
}
