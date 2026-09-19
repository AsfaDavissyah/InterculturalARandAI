import 'dart:async';
import 'dart:convert';

import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:http/http.dart' as http;

import 'auth_service.dart';

const String realtimePilotSettingId = 'ACADEMIC-LECTURER-OFFICE';
const Duration _realtimeAudioDrainDelay = Duration(milliseconds: 450);
const Duration _realtimeAudioCommitDelay = Duration(milliseconds: 150);
const Duration realtimeResponseTimeout = Duration(seconds: 15);

Map<String, dynamic> buildRealtimeManualTurnSessionUpdate() => {
  'type': 'session.update',
  'session': {
    'type': 'realtime',
    'audio': {
      'input': {'turn_detection': null},
    },
  },
};

bool shouldCreateRealtimeResponse({
  required bool responseActive,
  required bool responseRequested,
}) => !responseActive && !responseRequested;

class RealtimeSessionGrant {
  final String clientSecret;
  final int expiresAt;
  final String model;
  final String voice;
  final String settingId;
  final String researchSessionId;
  final String? realtimeSessionId;
  final Uri webRtcUrl;

  const RealtimeSessionGrant({
    required this.clientSecret,
    required this.expiresAt,
    required this.model,
    required this.voice,
    required this.settingId,
    required this.researchSessionId,
    required this.realtimeSessionId,
    required this.webRtcUrl,
  });

  factory RealtimeSessionGrant.fromJson(Map<String, dynamic> json) {
    return RealtimeSessionGrant(
      clientSecret: json['client_secret']?.toString() ?? '',
      expiresAt: int.tryParse(json['expires_at']?.toString() ?? '') ?? 0,
      model: json['model']?.toString() ?? 'gpt-realtime',
      voice: json['voice']?.toString() ?? 'marin',
      settingId: json['setting_id']?.toString() ?? '',
      researchSessionId: json['research_session_id']?.toString() ?? '',
      realtimeSessionId: json['realtime_session_id']?.toString(),
      webRtcUrl: Uri.parse(
        json['webrtc_url']?.toString() ??
            'https://api.openai.com/v1/realtime/calls',
      ),
    );
  }
}

class RealtimeUsage {
  final int responseCount;
  final int inputTextTokens;
  final int inputAudioTokens;
  final int cachedTextTokens;
  final int cachedAudioTokens;
  final int outputTextTokens;
  final int outputAudioTokens;

  const RealtimeUsage({
    this.responseCount = 0,
    this.inputTextTokens = 0,
    this.inputAudioTokens = 0,
    this.cachedTextTokens = 0,
    this.cachedAudioTokens = 0,
    this.outputTextTokens = 0,
    this.outputAudioTokens = 0,
  });

  factory RealtimeUsage.fromResponseDone(Map<String, dynamic> payload) {
    final response = Map<String, dynamic>.from(
      payload['response'] as Map? ?? const {},
    );
    final usage = Map<String, dynamic>.from(
      response['usage'] as Map? ?? const {},
    );
    if (usage.isEmpty) return const RealtimeUsage();
    final input = Map<String, dynamic>.from(
      usage['input_token_details'] as Map? ??
          usage['input_tokens_details'] as Map? ??
          const {},
    );
    final cached = Map<String, dynamic>.from(
      input['cached_tokens_details'] as Map? ?? const {},
    );
    final output = Map<String, dynamic>.from(
      usage['output_token_details'] as Map? ??
          usage['output_tokens_details'] as Map? ??
          const {},
    );
    return RealtimeUsage(
      responseCount: 1,
      inputTextTokens: (input['text_tokens'] as num?)?.toInt() ?? 0,
      inputAudioTokens: (input['audio_tokens'] as num?)?.toInt() ?? 0,
      cachedTextTokens: (cached['text_tokens'] as num?)?.toInt() ?? 0,
      cachedAudioTokens: (cached['audio_tokens'] as num?)?.toInt() ?? 0,
      outputTextTokens: (output['text_tokens'] as num?)?.toInt() ?? 0,
      outputAudioTokens: (output['audio_tokens'] as num?)?.toInt() ?? 0,
    );
  }

  double get estimatedResponseCostUsd {
    final uncachedText = (inputTextTokens - cachedTextTokens).clamp(
      0,
      inputTextTokens,
    );
    final uncachedAudio = (inputAudioTokens - cachedAudioTokens).clamp(
      0,
      inputAudioTokens,
    );
    return (uncachedText * 4.0 +
            cachedTextTokens * 0.4 +
            uncachedAudio * 32.0 +
            cachedAudioTokens * 0.4 +
            outputTextTokens * 16.0 +
            outputAudioTokens * 64.0) /
        1000000;
  }

  RealtimeUsage operator +(RealtimeUsage other) => RealtimeUsage(
    responseCount: responseCount + other.responseCount,
    inputTextTokens: inputTextTokens + other.inputTextTokens,
    inputAudioTokens: inputAudioTokens + other.inputAudioTokens,
    cachedTextTokens: cachedTextTokens + other.cachedTextTokens,
    cachedAudioTokens: cachedAudioTokens + other.cachedAudioTokens,
    outputTextTokens: outputTextTokens + other.outputTextTokens,
    outputAudioTokens: outputAudioTokens + other.outputAudioTokens,
  );

  Map<String, dynamic> toJson() => {
    'response_count': responseCount,
    'input_text_tokens': inputTextTokens,
    'input_audio_tokens': inputAudioTokens,
    'cached_text_tokens': cachedTextTokens,
    'cached_audio_tokens': cachedAudioTokens,
    'output_text_tokens': outputTextTokens,
    'output_audio_tokens': outputAudioTokens,
    'estimated_response_cost_usd': estimatedResponseCostUsd,
    'excludes_input_transcription_cost': true,
  };
}

class RealtimePilotEvent {
  final String type;
  final String? itemId;
  final String? transcriptDelta;
  final String? inputTranscriptDelta;
  final String? inputTranscript;
  final String? completedTranscript;
  final String? message;
  final RealtimeUsage? usage;

  const RealtimePilotEvent({
    required this.type,
    this.itemId,
    this.transcriptDelta,
    this.inputTranscriptDelta,
    this.inputTranscript,
    this.completedTranscript,
    this.message,
    this.usage,
  });
}

RealtimePilotEvent parseRealtimeServerEvent(String message) {
  final payload = jsonDecode(message) as Map<String, dynamic>;
  final type = payload['type']?.toString() ?? 'unknown';
  final isAgentTranscriptDelta =
      type == 'response.output_audio_transcript.delta' ||
      type == 'response.audio_transcript.delta';
  final isInputTranscriptComplete =
      type == 'conversation.item.input_audio_transcription.completed';
  final isInputTranscriptDelta =
      type == 'conversation.item.input_audio_transcription.delta';
  final isAgentTranscriptComplete =
      type == 'response.output_audio_transcript.done' ||
      type == 'response.audio_transcript.done';

  return RealtimePilotEvent(
    type: type,
    itemId:
        payload['item_id']?.toString() ??
        (payload['item'] as Map<String, dynamic>?)?['id']?.toString(),
    transcriptDelta: isAgentTranscriptDelta
        ? payload['delta']?.toString()
        : null,
    inputTranscriptDelta: isInputTranscriptDelta
        ? payload['delta']?.toString()
        : null,
    inputTranscript: isInputTranscriptComplete
        ? payload['transcript']?.toString()
        : null,
    completedTranscript: isAgentTranscriptComplete
        ? payload['transcript']?.toString()
        : null,
    message: payload['error']?['message']?.toString(),
    usage: type == 'response.done'
        ? RealtimeUsage.fromResponseDone(payload)
        : null,
  );
}

class RealtimeService {
  final String baseUrl;
  final http.Client _httpClient;
  final StreamController<RealtimePilotEvent> _events =
      StreamController<RealtimePilotEvent>.broadcast();

  RTCPeerConnection? _peerConnection;
  RTCDataChannel? _dataChannel;
  MediaStream? _localStream;
  final RTCVideoRenderer remoteRenderer = RTCVideoRenderer();
  bool _rendererInitialized = false;
  bool _microphoneEnabled = false;
  bool _responseActive = false;
  bool _responseRequested = false;
  bool _turnSubmissionInProgress = false;
  Completer<void>? _manualTurnConfiguration;
  Timer? _responseTimeoutTimer;
  RealtimeUsage _usage = const RealtimeUsage();
  bool _disposed = false;
  String? _researchSessionId;
  String? _realtimeSessionId;

  RealtimeService({required this.baseUrl, http.Client? httpClient})
    : _httpClient = httpClient ?? http.Client();

  Stream<RealtimePilotEvent> get events => _events.stream;
  bool get microphoneEnabled => _microphoneEnabled;
  String? get researchSessionId => _researchSessionId;
  String? get realtimeSessionId => _realtimeSessionId;
  RealtimeUsage get usage => _usage;

  Future<void> connect({
    required String scenarioId,
    required String settingId,
    required String researchSessionId,
    String? topicId,
    String? studentDisplayName,
  }) async {
    if (_disposed) throw StateError('Realtime service has been disposed.');
    if (_peerConnection != null) return;

    final normalizedSettingId = settingId.trim().toUpperCase();
    if (normalizedSettingId != realtimePilotSettingId) {
      throw StateError('Realtime is not enabled for this setting.');
    }

    final grant = await _requestSessionGrant(
      scenarioId: scenarioId,
      settingId: normalizedSettingId,
      researchSessionId: researchSessionId,
      topicId: topicId,
      studentDisplayName: studentDisplayName,
    );
    if (grant.clientSecret.isEmpty) {
      throw StateError('The server returned an invalid Realtime session.');
    }
    _researchSessionId = grant.researchSessionId;
    _realtimeSessionId = grant.realtimeSessionId;

    if (!_rendererInitialized) {
      await remoteRenderer.initialize();
      _rendererInitialized = true;
    }

    final localStream = await navigator.mediaDevices.getUserMedia({
      'audio': {
        'echoCancellation': true,
        'noiseSuppression': true,
        'autoGainControl': true,
      },
      'video': false,
    });
    for (final track in localStream.getAudioTracks()) {
      track.enabled = false;
    }

    final peerConnection = await createPeerConnection({
      'sdpSemantics': 'unified-plan',
      'iceServers': <Map<String, dynamic>>[],
    });
    _localStream = localStream;
    _peerConnection = peerConnection;

    for (final track in localStream.getTracks()) {
      await peerConnection.addTrack(track, localStream);
    }

    peerConnection.onTrack = (event) {
      if (event.track.kind != 'audio' || event.streams.isEmpty) return;
      remoteRenderer.srcObject = event.streams.first;
      unawaited(Helper.setSpeakerphoneOnButPreferBluetooth());
      _emit(const RealtimePilotEvent(type: 'remote_audio_ready'));
    };
    peerConnection.onConnectionState = (state) {
      _emit(RealtimePilotEvent(type: 'connection_state', message: state.name));
    };
    peerConnection.onIceConnectionState = (state) {
      _emit(RealtimePilotEvent(type: 'ice_state', message: state.name));
    };

    final channel = await peerConnection.createDataChannel(
      'oai-events',
      RTCDataChannelInit()..ordered = true,
    );
    final dataChannelReady = Completer<void>();
    _dataChannel = channel;
    channel.onDataChannelState = (state) {
      _emit(
        RealtimePilotEvent(type: 'data_channel_state', message: state.name),
      );
      if (state == RTCDataChannelState.RTCDataChannelOpen) {
        if (!dataChannelReady.isCompleted) dataChannelReady.complete();
      }
    };
    channel.onMessage = _handleDataChannelMessage;

    final offer = await peerConnection.createOffer({
      'offerToReceiveAudio': true,
      'offerToReceiveVideo': false,
    });
    await peerConnection.setLocalDescription(offer);
    final sdp = offer.sdp;
    if (sdp == null || sdp.isEmpty) {
      throw StateError('Unable to create a WebRTC audio offer.');
    }

    final response = await _httpClient
        .post(
          grant.webRtcUrl,
          headers: {
            'Authorization': 'Bearer ${grant.clientSecret}',
            'Content-Type': 'application/sdp',
          },
          body: sdp,
        )
        .timeout(const Duration(seconds: 15));
    if (response.statusCode != 201 && response.statusCode != 200) {
      throw StateError(
        'Realtime WebRTC negotiation failed (HTTP ${response.statusCode}).',
      );
    }
    await peerConnection.setRemoteDescription(
      RTCSessionDescription(response.body, 'answer'),
    );
    await dataChannelReady.future.timeout(
      const Duration(seconds: 10),
      onTimeout: () => throw TimeoutException(
        'Realtime audio channel did not become ready.',
      ),
    );

    _manualTurnConfiguration = Completer<void>();
    await _sendEvent(buildRealtimeManualTurnSessionUpdate());
    await _manualTurnConfiguration!.future.timeout(
      const Duration(seconds: 5),
      onTimeout: () => throw TimeoutException(
        'Realtime did not confirm manual turn control.',
      ),
    );
    _manualTurnConfiguration = null;
    _emit(
      RealtimePilotEvent(
        type: 'connected',
        message: '${grant.model} · ${grant.voice}',
      ),
    );
  }

  Future<RealtimeSessionGrant> _requestSessionGrant({
    required String scenarioId,
    required String settingId,
    required String researchSessionId,
    String? topicId,
    String? studentDisplayName,
  }) async {
    final token = await AuthService.getToken();
    if (token == null || token.isEmpty) {
      throw StateError('Please sign in again before starting Realtime.');
    }
    final response = await _httpClient
        .post(
          Uri.parse('$baseUrl/api/realtime/session'),
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
          body: jsonEncode({
            'scenario_id': scenarioId,
            'setting_id': settingId,
            'research_session_id': researchSessionId,
            if (topicId != null && topicId.isNotEmpty) 'topic_id': topicId,
            if (studentDisplayName != null && studentDisplayName.isNotEmpty)
              'student_display_name': studentDisplayName,
          }),
        )
        .timeout(const Duration(seconds: 12));

    Map<String, dynamic> payload = const {};
    try {
      payload = jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {}
    if (response.statusCode != 201) {
      throw StateError(
        payload['message']?.toString() ??
            'Unable to create a Realtime session (HTTP ${response.statusCode}).',
      );
    }
    return RealtimeSessionGrant.fromJson(payload);
  }

  Future<void> setMicrophoneEnabled(bool enabled, {bool submit = true}) async {
    final stream = _localStream;
    if (stream == null) throw StateError('Realtime is not connected.');
    if (_microphoneEnabled == enabled) return;
    if (!enabled && _turnSubmissionInProgress) return;

    if (enabled) {
      if (_responseActive || _responseRequested) {
        await cancelActiveResponse();
      }
      await _sendControlEvent('input_audio_buffer.clear');
    }

    if (!enabled) _turnSubmissionInProgress = true;
    try {
      if (!enabled && submit) {
        // WebRTC audio and control events use separate channels. Keep the track
        // open briefly so the last RTP packets arrive before the commit event.
        await Future<void>.delayed(_realtimeAudioDrainDelay);
      }

      for (final track in stream.getAudioTracks()) {
        track.enabled = enabled;
      }
      _microphoneEnabled = enabled;

      if (!enabled) {
        if (submit) {
          await Future<void>.delayed(_realtimeAudioCommitDelay);
          await _sendControlEvent('input_audio_buffer.commit');
          if (shouldCreateRealtimeResponse(
            responseActive: _responseActive,
            responseRequested: _responseRequested,
          )) {
            _responseRequested = true;
            await _sendControlEvent('response.create');
            _startResponseTimeout();
          }
        } else {
          await _sendControlEvent('input_audio_buffer.clear');
        }
      }

      _emit(
        RealtimePilotEvent(
          type: enabled ? 'microphone_started' : 'microphone_stopped',
        ),
      );
    } finally {
      if (!enabled) _turnSubmissionInProgress = false;
    }
  }

  Future<void> restoreConversation(
    List<Map<String, String>> conversation,
  ) async {
    for (final turn in conversation.reversed.take(12).toList().reversed) {
      final text = turn['message']?.trim() ?? '';
      if (text.isEmpty) continue;
      final isStudent = turn['speaker']?.toLowerCase() == 'student';
      await _sendEvent({
        'type': 'conversation.item.create',
        'item': {
          'type': 'message',
          'role': isStudent ? 'user' : 'assistant',
          'content': [
            {'type': isStudent ? 'input_text' : 'output_text', 'text': text},
          ],
        },
      });
    }
  }

  Future<void> cancelActiveResponse() async {
    _responseTimeoutTimer?.cancel();
    _responseTimeoutTimer = null;
    if (_responseActive || _responseRequested) {
      await _sendControlEvent('response.cancel');
      await _sendControlEvent('output_audio_buffer.clear');
    }
    _responseActive = false;
    _responseRequested = false;
  }

  void _startResponseTimeout() {
    _responseTimeoutTimer?.cancel();
    _responseTimeoutTimer = Timer(realtimeResponseTimeout, () {
      unawaited(_handleResponseTimeout());
    });
  }

  Future<void> _handleResponseTimeout() async {
    if (!_responseActive && !_responseRequested) return;
    try {
      await cancelActiveResponse();
    } catch (_) {
      _responseActive = false;
      _responseRequested = false;
    }
    _emit(
      const RealtimePilotEvent(
        type: 'response_timeout',
        message: 'Realtime response exceeded the time limit.',
      ),
    );
  }

  Future<void> _sendControlEvent(String type) async {
    await _sendEvent({'type': type});
  }

  Future<void> _sendEvent(Map<String, dynamic> event) async {
    final channel = _dataChannel;
    if (channel == null ||
        channel.state != RTCDataChannelState.RTCDataChannelOpen) {
      throw StateError('Realtime control channel is not ready.');
    }
    await channel.send(RTCDataChannelMessage(jsonEncode(event)));
  }

  void _handleDataChannelMessage(RTCDataChannelMessage message) {
    if (message.isBinary || message.text.isEmpty) return;
    try {
      final event = parseRealtimeServerEvent(message.text);
      if (event.type == 'session.updated') {
        final configuration = _manualTurnConfiguration;
        if (configuration != null && !configuration.isCompleted) {
          configuration.complete();
        }
      }
      if (event.type == 'error') {
        final configuration = _manualTurnConfiguration;
        if (configuration != null && !configuration.isCompleted) {
          configuration.completeError(
            StateError(event.message ?? 'Realtime session update failed.'),
          );
        }
      }
      if (event.type == 'response.created') {
        _responseRequested = false;
        _responseActive = true;
      }
      if (event.type == 'response.done') {
        _responseTimeoutTimer?.cancel();
        _responseTimeoutTimer = null;
        _responseRequested = false;
        _responseActive = false;
        if (event.usage != null) _usage += event.usage!;
      }
      _emit(event);
    } catch (_) {
      _emit(const RealtimePilotEvent(type: 'unparsed_event'));
    }
  }

  void _emit(RealtimePilotEvent event) {
    if (!_disposed && !_events.isClosed) _events.add(event);
  }

  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    _responseTimeoutTimer?.cancel();
    for (final track in _localStream?.getTracks() ?? <MediaStreamTrack>[]) {
      await track.stop();
    }
    await _dataChannel?.close();
    await _peerConnection?.close();
    await _localStream?.dispose();
    remoteRenderer.srcObject = null;
    if (_rendererInitialized) await remoteRenderer.dispose();
    _httpClient.close();
    await _events.close();
  }
}
