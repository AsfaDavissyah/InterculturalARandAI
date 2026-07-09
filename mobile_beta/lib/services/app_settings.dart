import 'package:shared_preferences/shared_preferences.dart';

class AppSettings {
  static const _baseUrlKey = 'api_base_url';
  static const defaultBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

  static Future<String> getBaseUrl() async {
    try {
      final preferences = await SharedPreferences.getInstance();
      return preferences.getString(_baseUrlKey) ?? defaultBaseUrl;
    } catch (_) {
      return defaultBaseUrl;
    }
  }

  static Future<void> setBaseUrl(String value) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_baseUrlKey, normalizeBaseUrl(value));
  }

  static String normalizeBaseUrl(String value) {
    var normalized = value.trim();
    if (!normalized.startsWith('http://') &&
        !normalized.startsWith('https://')) {
      normalized = 'http://$normalized';
    }
    while (normalized.endsWith('/')) {
      normalized = normalized.substring(0, normalized.length - 1);
    }
    return normalized;
  }
}
