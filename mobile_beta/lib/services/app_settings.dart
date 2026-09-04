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
  static const _productionBaseUrl = 'https://api.202-10-37-3.sslip.io';
  static const _pilotDeviceLabelKey = 'pilot_device_label';
  static const _pilotNetworkProfileKey = 'pilot_network_profile';
  static const _pilotInstallTypeKey = 'pilot_install_type';
  static const defaultBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: _productionBaseUrl,
  );

  static Future<String> getBaseUrl() async {
    try {
      final preferences = await SharedPreferences.getInstance();
      await preferences.remove(_baseUrlKey);
    } catch (_) {
      // The production endpoint remains available without local preferences.
    }
    return defaultBaseUrl;
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
}
