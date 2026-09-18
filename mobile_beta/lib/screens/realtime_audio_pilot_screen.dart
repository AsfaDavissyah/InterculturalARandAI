import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

import '../models/scenario_topic.dart';
import '../services/realtime_service.dart';
import '../theme/engora_theme.dart';

class RealtimeAudioPilotScreen extends StatefulWidget {
  final String baseUrl;
  final ScenarioTopic scenario;
  final String settingId;
  final String? topicId;
  final String? studentDisplayName;

  const RealtimeAudioPilotScreen({
    super.key,
    required this.baseUrl,
    required this.scenario,
    required this.settingId,
    this.topicId,
    this.studentDisplayName,
  });

  @override
  State<RealtimeAudioPilotScreen> createState() =>
      _RealtimeAudioPilotScreenState();
}

class _RealtimeAudioPilotScreenState extends State<RealtimeAudioPilotScreen> {
  late final RealtimeService _service = RealtimeService(
    baseUrl: widget.baseUrl,
  );
  StreamSubscription<RealtimePilotEvent>? _subscription;
  String _status = 'Ready to connect';
  String _transcript = '';
  String? _error;
  bool _connecting = false;
  bool _connected = false;
  bool _microphoneEnabled = false;
  bool _remoteAudioReady = false;

  @override
  void initState() {
    super.initState();
    _subscription = _service.events.listen(_onEvent);
  }

  void _onEvent(RealtimePilotEvent event) {
    if (!mounted) return;
    setState(() {
      switch (event.type) {
        case 'connected':
          _connected = true;
          _connecting = false;
          _status = 'Connected · ${event.message ?? 'Realtime'}';
        case 'remote_audio_ready':
          _remoteAudioReady = true;
        case 'microphone_started':
          _microphoneEnabled = true;
          _status = 'Listening';
        case 'microphone_stopped':
          _microphoneEnabled = false;
          _status = 'Preparing response';
        case 'response.created':
          _status = 'Preparing response';
        case 'response.output_audio.delta':
        case 'response.audio.delta':
          _status = 'Speaking';
        case 'response.done':
          _status = 'Ready';
        case 'error':
          _error = event.message ?? 'Realtime returned an error.';
      }
      final delta = event.transcriptDelta;
      if (delta != null && delta.isNotEmpty) _transcript += delta;
    });
  }

  Future<void> _connect() async {
    if (_connecting || _connected) return;
    setState(() {
      _connecting = true;
      _error = null;
      _status = 'Connecting';
    });
    try {
      await _service.connect(
        scenarioId: widget.scenario.id,
        settingId: widget.settingId,
        topicId: widget.topicId,
        studentDisplayName: widget.studentDisplayName,
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _connecting = false;
        _error = error.toString().replaceFirst('Bad state: ', '');
        _status = 'Connection failed';
      });
    }
  }

  Future<void> _toggleMicrophone() async {
    try {
      await _service.setMicrophoneEnabled(!_microphoneEnabled);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString().replaceFirst('Bad state: ', ''));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EngoraColors.background,
      appBar: AppBar(
        title: const Text('Realtime Audio Pilot'),
        backgroundColor: EngoraColors.background,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.scenario.title,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Icon(
                            _connected
                                ? Icons.check_circle_outline_rounded
                                : Icons.radio_button_unchecked_rounded,
                            color: _connected
                                ? EngoraColors.professionalAccent
                                : EngoraColors.muted,
                          ),
                          const SizedBox(width: 8),
                          Expanded(child: Text(_status)),
                        ],
                      ),
                      if (_remoteAudioReady) ...[
                        const SizedBox(height: 8),
                        const Row(
                          children: [
                            Icon(Icons.volume_up_outlined, size: 20),
                            SizedBox(width: 8),
                            Text('Audio channel ready'),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(
                  _error!,
                  style: const TextStyle(color: EngoraColors.danger),
                ),
              ],
              const SizedBox(height: 20),
              if (!_connected)
                FilledButton.icon(
                  onPressed: _connecting ? null : _connect,
                  icon: _connecting
                      ? const SizedBox.square(
                          dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.link_rounded),
                  label: Text(_connecting ? 'Connecting' : 'Connect'),
                )
              else
                Center(
                  child: IconButton.filled(
                    tooltip: _microphoneEnabled ? 'Stop listening' : 'Speak',
                    onPressed: _toggleMicrophone,
                    style: IconButton.styleFrom(
                      minimumSize: const Size(72, 72),
                      backgroundColor: _microphoneEnabled
                          ? EngoraColors.danger
                          : EngoraColors.brand,
                    ),
                    icon: Icon(
                      _microphoneEnabled
                          ? Icons.stop_rounded
                          : Icons.mic_rounded,
                      size: 30,
                    ),
                  ),
                ),
              const SizedBox(height: 20),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: EngoraColors.line),
                  ),
                  child: SingleChildScrollView(
                    child: Text(
                      _transcript.isEmpty ? 'Agent transcript' : _transcript,
                      style: TextStyle(
                        color: _transcript.isEmpty
                            ? EngoraColors.muted
                            : EngoraColors.ink,
                        height: 1.45,
                      ),
                    ),
                  ),
                ),
              ),
              SizedBox.square(
                dimension: 1,
                child: RTCVideoView(
                  _service.remoteRenderer,
                  objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitContain,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    unawaited(_subscription?.cancel());
    unawaited(_service.dispose());
    super.dispose();
  }
}
