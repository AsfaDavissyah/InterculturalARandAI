import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_beta/models/conversation_latency.dart';
import 'package:mobile_beta/services/setting_visual_registry.dart';

ConversationLatencyTrace trace(int turn, int firstAudioMs) {
  final start = DateTime.utc(2026, 8, 15, 8, 0, turn);
  return ConversationLatencyTrace(
    turnNumber: turn,
    speechFinalAt: start,
    thinkingVisibleAt: start.add(const Duration(milliseconds: 80)),
    chatRequestStartedAt: start.add(const Duration(milliseconds: 90)),
    aiTextReceivedAt: start.add(const Duration(milliseconds: 900)),
    ttsReadyAt: start.add(const Duration(milliseconds: 1250)),
    audioPlaybackStartedAt: start.add(Duration(milliseconds: firstAudioMs)),
    audioSource: 'neural',
  );
}

void main() {
  test('latency trace round-trips and exposes measured stages', () {
    final original = trace(1, 1800);
    final restored = ConversationLatencyTrace.fromJson(original.toJson());

    expect(restored.turnNumber, 1);
    expect(restored.thinkingDelayMs, 80);
    expect(restored.aiTextLatencyMs, 810);
    expect(restored.ttsPreparationMs, 350);
    expect(restored.firstAudioLatencyMs, 1800);
    expect(restored.audioSource, 'neural');
  });

  test('latency summary reports median and p95 from completed turns', () {
    final summary = ConversationLatencySummary.fromTraces([
      trace(1, 1400),
      trace(2, 1800),
      trace(3, 2200),
      trace(4, 3000),
    ]);

    expect(summary.sampleCount, 4);
    expect(summary.medianFirstAudioMs, 2200);
    expect(summary.p95FirstAudioMs, 3000);
  });

  test('all six guided settings have a safe visual fallback', () {
    expect(
      SettingVisualRegistry.registeredKeys,
      containsAll({
        'sticker_lecturer_office',
        'sticker_after_class',
        'sticker_london_restaurant',
        'sticker_melbourne_cafe',
        'sticker_interview_room',
        'sticker_career_fair',
      }),
    );
    for (final key in SettingVisualRegistry.registeredKeys) {
      final visual = SettingVisualRegistry.resolve(key);
      expect(visual.fallbackLabel, isNotEmpty);
      expect(visual.hasAsset, isFalse);
    }
  });
}
