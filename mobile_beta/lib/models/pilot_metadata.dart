class PilotMetadata {
  final DateTime capturedAt;
  final String deviceLabel;
  final String platform;
  final String osVersion;
  final double viewportWidth;
  final double viewportHeight;
  final double pixelRatio;
  final String networkProfile;
  final String installType;
  final String appBuild;

  const PilotMetadata({
    required this.capturedAt,
    required this.deviceLabel,
    required this.platform,
    required this.osVersion,
    required this.viewportWidth,
    required this.viewportHeight,
    required this.pixelRatio,
    required this.networkProfile,
    required this.installType,
    required this.appBuild,
  });

  factory PilotMetadata.fromJson(Map<String, dynamic> json) {
    return PilotMetadata(
      capturedAt: DateTime.parse(json['captured_at'] as String).toUtc(),
      deviceLabel: json['device_label'] as String? ?? 'Unreported device',
      platform: json['platform'] as String? ?? 'unknown',
      osVersion: json['os_version'] as String? ?? 'unknown',
      viewportWidth: (json['viewport_width'] as num?)?.toDouble() ?? 0,
      viewportHeight: (json['viewport_height'] as num?)?.toDouble() ?? 0,
      pixelRatio: (json['pixel_ratio'] as num?)?.toDouble() ?? 1,
      networkProfile: json['network_profile'] as String? ?? 'unreported',
      installType: json['install_type'] as String? ?? 'unreported',
      appBuild: json['app_build'] as String? ?? 'unknown',
    );
  }

  Map<String, dynamic> toJson() => {
    'captured_at': capturedAt.toUtc().toIso8601String(),
    'device_label': deviceLabel,
    'platform': platform,
    'os_version': osVersion,
    'viewport_width': viewportWidth,
    'viewport_height': viewportHeight,
    'pixel_ratio': pixelRatio,
    'network_profile': networkProfile,
    'install_type': installType,
    'app_build': appBuild,
  };
}
