import 'dart:convert';
import 'package:http/http.dart' as http;

/// Shares prewarming and playback requests without retaining conversation audio
/// URLs indefinitely. Failed requests are never cached.
class TtsAudioService {
  static final shared = TtsAudioService();
  final http.Client _client;
  final Duration timeout;
  final Map<String, Future<String?>> _pending = {};
  final Map<String, ({String url, DateTime expires})> _cache = {};

  TtsAudioService({
    http.Client? client,
    this.timeout = const Duration(seconds: 8),
  }) : _client = client ?? http.Client();

  Future<String?> request(String baseUrl, Map<String, String> payload) {
    final ordered = Map.fromEntries(
      payload.entries.toList()..sort((a, b) => a.key.compareTo(b.key)),
    );
    final key = '$baseUrl:${jsonEncode(ordered)}';
    _cache.removeWhere((_, value) => value.expires.isBefore(DateTime.now()));
    final cached = _cache[key];
    if (cached != null) return Future.value(cached.url);
    return _pending.putIfAbsent(key, () => _fetch(baseUrl, payload, key));
  }

  Future<String?> _fetch(
    String baseUrl,
    Map<String, String> payload,
    String key,
  ) async {
    try {
      final response = await _client
          .post(
            Uri.parse('$baseUrl/api/tts'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(payload),
          )
          .timeout(timeout);
      if (response.statusCode != 200) return null;
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final url = data['audio_url'];
      final uri = url is String ? Uri.tryParse(url) : null;
      if (uri == null ||
          !uri.hasAuthority ||
          !['https', 'http'].contains(uri.scheme)) {
        return null;
      }
      if (_cache.length >= 32) _cache.remove(_cache.keys.first);
      _cache[key] = (
        url: url as String,
        expires: DateTime.now().add(const Duration(minutes: 5)),
      );
      return url;
    } catch (_) {
      return null;
    } finally {
      _pending.remove(key);
    }
  }
}
