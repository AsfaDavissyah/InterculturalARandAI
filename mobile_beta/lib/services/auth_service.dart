import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'app_settings.dart';

class UserProfile {
  final String name;
  final String email;
  final String gender;
  final String role;
  final String studentId;
  final String studentLecturerCode;
  final bool consent;

  UserProfile({
    required this.name,
    required this.email,
    required this.gender,
    required this.role,
    required this.studentId,
    required this.studentLecturerCode,
    required this.consent,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      gender: json['gender'] ?? 'female',
      role: json['role'] ?? 'student',
      studentId: json['studentId'] ?? '',
      studentLecturerCode: json['studentLecturerCode'] ?? '',
      consent: json['consent'] ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'email': email,
        'gender': gender,
        'role': role,
        'studentId': studentId,
        'studentLecturerCode': studentLecturerCode,
        'consent': consent,
      };
}

class AuthService {
  static const String _tokenKey = 'auth_jwt_token';
  static const String _profileKey = 'auth_user_profile';

  static String? _cachedToken;
  static UserProfile? _cachedProfile;

  /// Returns the saved JWT Token. Uses memory cache for quick access.
  static Future<String?> getToken() async {
    if (_cachedToken != null) return _cachedToken;
    final prefs = await SharedPreferences.getInstance();
    _cachedToken = prefs.getString(_tokenKey);
    return _cachedToken;
  }

  /// Returns the saved User Profile.
  static Future<UserProfile?> getProfile() async {
    if (_cachedProfile != null) return _cachedProfile;
    final prefs = await SharedPreferences.getInstance();
    final rawProfile = prefs.getString(_profileKey);
    if (rawProfile == null) return null;
    try {
      _cachedProfile = UserProfile.fromJson(
        jsonDecode(rawProfile) as Map<String, dynamic>,
      );
      return _cachedProfile;
    } catch (_) {
      return null;
    }
  }

  /// Returns whether a user is currently logged in.
  static Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  /// Handles Login requests to the backend.
  static Future<bool> login({
    required String email,
    required String password,
  }) async {
    final baseUrl = await AppSettings.getBaseUrl();
    final url = Uri.parse('$baseUrl/api/auth/login');

    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final token = data['token'] as String;
        final profile = UserProfile.fromJson(
          data['user'] as Map<String, dynamic>,
        );

        await _saveAuth(token, profile);
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Handles Signup requests to the backend.
  static Future<bool> signup({
    required String name,
    required String email,
    required String password,
    required String gender,
    required String studentId,
    required String studentLecturerCode,
    required bool consent,
  }) async {
    final baseUrl = await AppSettings.getBaseUrl();
    final url = Uri.parse('$baseUrl/api/auth/signup');

    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'name': name,
          'email': email,
          'password': password,
          'gender': gender,
          'studentId': studentId,
          'studentLecturerCode': studentLecturerCode,
          'consent': consent,
        }),
      );

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final token = data['token'] as String;
        final profile = UserProfile.fromJson(
          data['user'] as Map<String, dynamic>,
        );

        await _saveAuth(token, profile);
        return true;
      } else {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        throw Exception(data['error'] ?? 'Registrasi gagal.');
      }
    } catch (e) {
      if (e.toString().contains('Exception:')) rethrow;
      throw Exception('Connection error. Check your backend server connection.');
    }
  }

  /// Helper to save auth state to persistent storage.
  static Future<void> _saveAuth(String token, UserProfile profile) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setString(_profileKey, jsonEncode(profile.toJson()));
    
    _cachedToken = token;
    _cachedProfile = profile;
  }

  /// Logs out the user and clears all cached credentials.
  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_profileKey);
    
    _cachedToken = null;
    _cachedProfile = null;
  }

  /// Updates user profile details both on the backend and locally.
  static Future<bool> updateProfile({
    required String name,
    required String gender,
  }) async {
    final baseUrl = await AppSettings.getBaseUrl();
    final url = Uri.parse('$baseUrl/api/auth/update');
    final token = await getToken();

    if (token == null) return false;

    try {
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'name': name,
          'gender': gender,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final profile = UserProfile.fromJson(
          data['user'] as Map<String, dynamic>,
        );

        // Update local cache
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_profileKey, jsonEncode(profile.toJson()));
        _cachedProfile = profile;
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }
}
