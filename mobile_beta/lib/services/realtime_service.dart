import 'dart:async';
import 'dart:convert';

import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:http/http.dart' as http;

import 'auth_service.dart';

const String realtimePilotSettingId = 'ACADEMIC-LECTURER-OFFICE';

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

class RealtimePilotEvent {
  final String type;
  final String? itemId;
  final String? transcriptDelta;
  final String? inputTranscriptDelta;
  final String? inputTranscript;
  final String? completedTranscript;
  final String? message;

  const RealtimePilotEvent({
    required this.type,
    this.itemId,
    this.transcriptDelta,
    this.inputTranscriptDelta,
    this.inputTranscript,
    this.completedTranscript,
    this.message,
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
  bool _disposed = false;
  String? _researchSessionId;
  String? _realtimeSessionId;

  RealtimeService({required this.baseUrl, http.Client? httpClient})
    : _httpClient = httpClient ?? http.Client();

  Stream<RealtimePilotEvent> get events => _events.stream;
  bool get microphoneEnabled => _microphoneEnabled;
  String? get researchSessionId => _researchSessionId;
  String? get realtimeSessionId => _realtimeSessionId;

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
        _emit(
          RealtimePilotEvent(
            type: 'connected',
            message: '${grant.model} · ${grant.voice}',
          ),
        );
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

  Future<void> setMicrophoneEnabled(bool enabled) async {
    final stream = _localStream;
    if (stream == null) throw StateError('Realtime is not connected.');
    for (final track in stream.getAudioTracks()) {
      track.enabled = enabled;
    }
    _microphoneEnabled = enabled;
    _emit(
      RealtimePilotEvent(
        type: enabled ? 'microphone_started' : 'microphone_stopped',
      ),
    );
  }

  void _handleDataChannelMessage(RTCDataChannelMessage message) {
    if (message.isBinary || message.text.isEmpty) return;
    try {
      final event = parseRealtimeServerEvent(message.text);
      if (event.type == 'input_audio_buffer.speech_stopped' &&
          _microphoneEnabled) {
        unawaited(setMicrophoneEnabled(false));
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
