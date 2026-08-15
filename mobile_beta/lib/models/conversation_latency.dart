class ConversationLatencyTrace {
  final int turnNumber;
  final DateTime speechFinalAt;
  final DateTime thinkingVisibleAt;
  final DateTime chatRequestStartedAt;
  final DateTime aiTextReceivedAt;
  final DateTime ttsReadyAt;
  final DateTime audioPlaybackStartedAt;
  final String audioSource;

  const ConversationLatencyTrace({
    required this.turnNumber,
    required this.speechFinalAt,
    required this.thinkingVisibleAt,
    required this.chatRequestStartedAt,
    required this.aiTextReceivedAt,
    required this.ttsReadyAt,
    required this.audioPlaybackStartedAt,
    required this.audioSource,
  });

  int get thinkingDelayMs => thinkingVisibleAt
      .difference(speechFinalAt)
      .inMilliseconds
      .clamp(0, 1 << 31)
      .toInt();

  int get aiTextLatencyMs => aiTextReceivedAt
      .difference(chatRequestStartedAt)
      .inMilliseconds
      .clamp(0, 1 << 31)
      .toInt();

  int get ttsPreparationMs => ttsReadyAt
      .difference(aiTextReceivedAt)
      .inMilliseconds
      .clamp(0, 1 << 31)
      .toInt();

  int get firstAudioLatencyMs => audioPlaybackStartedAt
      .difference(speechFinalAt)
      .inMilliseconds
      .clamp(0, 1 << 31)
      .toInt();

  factory ConversationLatencyTrace.fromJson(Map<String, dynamic> json) {
    DateTime timestamp(String key) =>
        DateTime.parse(json[key] as String).toUtc();

    return ConversationLatencyTrace(
      turnNumber: (json['turn_number'] as num?)?.toInt() ?? 0,
      speechFinalAt: timestamp('speech_final_at'),
      thinkingVisibleAt: timestamp('thinking_visible_at'),
      chatRequestStartedAt: timestamp('chat_request_started_at'),
      aiTextReceivedAt: timestamp('ai_text_received_at'),
      ttsReadyAt: timestamp('tts_ready_at'),
      audioPlaybackStartedAt: timestamp('audio_playback_started_at'),
      audioSource: json['audio_source'] as String? ?? 'unknown',
    );
  }

  Map<String, dynamic> toJson() => {
    'turn_number': turnNumber,
    'speech_final_at': speechFinalAt.toUtc().toIso8601String(),
    'thinking_visible_at': thinkingVisibleAt.toUtc().toIso8601String(),
    'chat_request_started_at': chatRequestStartedAt.toUtc().toIso8601String(),
    'ai_text_received_at': aiTextReceivedAt.toUtc().toIso8601String(),
    'tts_ready_at': ttsReadyAt.toUtc().toIso8601String(),
    'audio_playback_started_at': audioPlaybackStartedAt
        .toUtc()
        .toIso8601String(),
    'audio_source': audioSource,
    'thinking_delay_ms': thinkingDelayMs,
    'ai_text_latency_ms': aiTextLatencyMs,
    'tts_preparation_ms': ttsPreparationMs,
    'first_audio_latency_ms': firstAudioLatencyMs,
  };
}

class ConversationLatencySummary {
  final int sampleCount;
  final int medianFirstAudioMs;
  final int p95FirstAudioMs;

  const ConversationLatencySummary({
    required this.sampleCount,
    required this.medianFirstAudioMs,
    required this.p95FirstAudioMs,
  });

  factory ConversationLatencySummary.fromTraces(
    List<ConversationLatencyTrace> traces,
  ) {
    if (traces.isEmpty) {
      return const ConversationLatencySummary(
        sampleCount: 0,
        medianFirstAudioMs: 0,
        p95FirstAudioMs: 0,
      );
    }
    final values = traces.map((trace) => trace.firstAudioLatencyMs).toList()
      ..sort();
    final medianIndex = ((values.length - 1) * 0.5).ceil();
    final p95Index = ((values.length - 1) * 0.95).ceil();
    return ConversationLatencySummary(
      sampleCount: values.length,
      medianFirstAudioMs: values[medianIndex],
      p95FirstAudioMs: values[p95Index],
    );
  }

  Map<String, dynamic> toJson() => {
    'sample_count': sampleCount,
    'median_first_audio_ms': medianFirstAudioMs,
    'p95_first_audio_ms': p95FirstAudioMs,
  };
}

class ConversationLatencyDraft {
  final int turnNumber;
  final DateTime speechFinalAt;
  final DateTime thinkingVisibleAt;
  final DateTime chatRequestStartedAt;
  DateTime? aiTextReceivedAt;
  DateTime? ttsReadyAt;
  String audioSource = 'unknown';
  bool completed = false;

  ConversationLatencyDraft({
    required this.turnNumber,
    required this.speechFinalAt,
    required this.thinkingVisibleAt,
    required this.chatRequestStartedAt,
  });

  ConversationLatencyTrace? complete(DateTime audioPlaybackStartedAt) {
    if (completed || aiTextReceivedAt == null || ttsReadyAt == null)
      return null;
    completed = true;
    return ConversationLatencyTrace(
      turnNumber: turnNumber,
      speechFinalAt: speechFinalAt,
      thinkingVisibleAt: thinkingVisibleAt,
      chatRequestStartedAt: chatRequestStartedAt,
      aiTextReceivedAt: aiTextReceivedAt!,
      ttsReadyAt: ttsReadyAt!,
      audioPlaybackStartedAt: audioPlaybackStartedAt,
      audioSource: audioSource,
    );
  }
}
