import 'dart:io';

import 'package:flutter/widgets.dart';

import '../models/pilot_metadata.dart';
import 'app_settings.dart';

class PilotEvidenceService {
  static const appBuild = String.fromEnvironment(
    'APP_BUILD_LABEL',
    defaultValue: '1.0.0+1',
  );

  static Future<PilotMetadata> capture(BuildContext context) async {
    final media = MediaQuery.of(context);
    final testContext = await AppSettings.getPilotTestContext();
    return PilotMetadata(
      capturedAt: DateTime.now().toUtc(),
      deviceLabel: testContext.deviceLabel,
      platform: Platform.operatingSystem,
      osVersion: Platform.operatingSystemVersion,
      viewportWidth: media.size.width,
      viewportHeight: media.size.height,
      pixelRatio: media.devicePixelRatio,
      networkProfile: testContext.networkProfile,
      installType: testContext.installType,
      appBuild: appBuild,
    );
  }
}
