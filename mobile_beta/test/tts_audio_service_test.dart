import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile_beta/services/tts_audio_service.dart';

void main() {
  const payload = {'text': 'Hello', 'gender': 'male'};
  test('prewarm, concurrent playback and replay share one request', () async {
    var calls = 0;
    final response = Completer<http.Response>();
    final service = TtsAudioService(
      client: MockClient((request) {
        calls++;
        return response.future;
      }),
    );
    final first = service.request('https://example.test', payload);
    final second = service.request('https://example.test', {
      'gender': 'male',
      'text': 'Hello',
    });
    response.complete(
      http.Response('{"audio_url":"https://example.test/audio.mp3"}', 200),
    );
    expect(await first, await second);
    expect(
      await service.request('https://example.test', payload),
      'https://example.test/audio.mp3',
    );
    expect(calls, 1);
  });

  test('failed responses are retried, not cached', () async {
    var calls = 0;
    final service = TtsAudioService(
      client: MockClient((_) async {
        calls++;
        return calls == 1
            ? http.Response('unavailable', 503)
            : http.Response(
                '{"audio_url":"https://example.test/audio.mp3"}',
                200,
              );
      }),
    );
    expect(await service.request('https://example.test', payload), isNull);
    expect(await service.request('https://example.test', payload), isNotNull);
    expect(calls, 2);
  });

  test('voice context and backend separate cached entries', () async {
    var calls = 0;
    final service = TtsAudioService(
      client: MockClient((_) async {
        calls++;
        return http.Response(
          '{"audio_url":"https://example.test/audio.mp3"}',
          200,
        );
      }),
    );
    await service.request('https://example.test', payload);
    await service.request('https://example.test', {
      ...payload,
      'setting_id': 'OFFICE',
    });
    await service.request('https://another.test', payload);
    expect(calls, 3);
  });

  test('timeouts and invalid audio URLs permit fallback', () async {
    final slow = TtsAudioService(
      timeout: const Duration(milliseconds: 5),
      client: MockClient((_) => Completer<http.Response>().future),
    );
    expect(await slow.request('https://example.test', payload), isNull);
    for (final body in [
      'invalid json',
      '{"audio_url":"file:///private"}',
      '{}',
    ]) {
      final service = TtsAudioService(
        client: MockClient((_) async => http.Response(body, 200)),
      );
      expect(await service.request('https://example.test', payload), isNull);
    }
  });
}
