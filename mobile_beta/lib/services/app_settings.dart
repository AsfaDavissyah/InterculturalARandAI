import 'package:shared_preferences/shared_preferences.dart';

class PilotTestContext {
  final String deviceLabel;
  final String networkProfile;
  final String installType;

  const PilotTestContext({
    this.deviceLabel = 'Unreported device',
    this.networkProfile = 'unreported',
    this.installType = 'unreported',
  });
}

class AppSettings {
  static const _baseUrlKey = 'api_base_url';
  static const _pilotDeviceLabelKey = 'pilot_device_label';
  static const _pilotNetworkProfileKey = 'pilot_network_profile';
  static const _pilotInstallTypeKey = 'pilot_install_type';
  static const defaultBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://interculturalarandai-production.up.railway.app',
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

  static Future<PilotTestContext> getPilotTestContext() async {
    try {
      final preferences = await SharedPreferences.getInstance();
      return PilotTestContext(
        deviceLabel:
            preferences.getString(_pilotDeviceLabelKey) ?? 'Unreported device',
        networkProfile:
            preferences.getString(_pilotNetworkProfileKey) ?? 'unreported',
        installType:
            preferences.getString(_pilotInstallTypeKey) ?? 'unreported',
      );
    } catch (_) {
      return const PilotTestContext();
    }
  }

  static Future<void> setPilotTestContext(PilotTestContext context) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _pilotDeviceLabelKey,
      context.deviceLabel.trim().isEmpty
          ? 'Unreported device'
          : context.deviceLabel.trim(),
    );
    await preferences.setString(
      _pilotNetworkProfileKey,
      context.networkProfile,
    );
    await preferences.setString(_pilotInstallTypeKey, context.installType);
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
