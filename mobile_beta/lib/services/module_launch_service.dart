import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/module_launch.dart';
import 'app_settings.dart';

class ModuleLaunchService {
  const ModuleLaunchService();

  Future<ModuleLaunch> resolve(String scannedValue) async {
    final baseUrl = await AppSettings.getBaseUrl();
    final response = await http
        .post(
          Uri.parse('$baseUrl/api/launch/resolve'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'token': scannedValue}),
        )
        .timeout(const Duration(seconds: 10));

    final body = response.body.isEmpty
        ? <String, dynamic>{}
        : Map<String, dynamic>.from(jsonDecode(response.body) as Map);
    if (response.statusCode != 200) {
      throw Exception(
        body['error']?.toString() ?? 'The QR activity could not be opened.',
      );
    }
    return ModuleLaunch.fromJson(body);
  }
}
