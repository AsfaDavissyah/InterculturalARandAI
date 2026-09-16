import 'dart:async';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:speech_to_text/speech_recognition_error.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../models/ai_response.dart';
import '../models/conversation_latency.dart';
import '../models/guided_setting.dart';
import '../models/practice_session.dart';
import '../models/scenario_topic.dart';
import '../models/speech_draft.dart';
import '../models/pending_turn.dart';
import '../services/app_settings.dart';
import '../services/auth_service.dart';
import '../services/avatar_registry.dart';
import '../services/chat_service.dart';
import '../services/tts_audio_service.dart';
import '../services/practice_history_store.dart';
import '../services/pilot_evidence_service.dart';
import '../theme/engora_theme.dart';
import '../widgets/app_svg_icon.dart';
import '../widgets/ar_avatar.dart';
import '../widgets/ar_avatar_3d.dart';
import '../widgets/setting_visual.dart';
import 'result_screen.dart';

Size cameraPreviewDisplaySize(Size previewSize, Orientation orientation) {
  return orientation == Orientation.portrait
      ? Size(previewSize.height, previewSize.width)
      : previewSize;
}

List<String> buildTranscriptAlternatives({
  required String primary,
  required Iterable<String> alternatives,
  String accumulatedPrefix = '',
}) {
  final results = <String>[];
  final seen = <String>{};
  for (final rawCandidate in [primary, ...alternatives]) {
    final candidate = rawCandidate.trim();
    if (candidate.isEmpty) continue;
    final combined = accumulatedPrefix.trim().isEmpty
        ? candidate
        : '${accumulatedPrefix.trim()} $candidate';
    final normalized = combined.toLowerCase().replaceAll(RegExp(r'\s+'), ' ');
    if (seen.add(normalized)) results.add(combined.trim());
  }
  return results.take(3).toList(growable: false);
}

class ConversationMessage {
  final String speaker;
  final String message;

  const ConversationMessage({required this.speaker, required this.message});
}

class ArSpeakingScreen extends StatefulWidget {
  final ScenarioTopic scenario;
  final String? topicId;
  final String? topicTitle;
  final String? settingId;
  final String? settingTitle;
  final String? avatarKey;
  final String? stickerAssetKey;
  final GuidedSetting? guidedSetting;
  final String experienceType;
  final String launchSource;
  final String? moduleId;
  final String? unitId;
  final String? pageId;

  const ArSpeakingScreen({
    super.key,
    required this.scenario,
    this.topicId,
    this.topicTitle,
    this.settingId,
    this.settingTitle,
    this.avatarKey,
    this.stickerAssetKey,
    this.guidedSetting,
    this.experienceType = 'legacy_scenario',
    this.launchSource = 'legacy',
    this.moduleId,
    this.unitId,
    this.pageId,
  });

  @override
  State<ArSpeakingScreen> createState() => _ArSpeakingScreenState();
}

class _ArSpeakingScreenState extends State<ArSpeakingScreen>
    with WidgetsBindingObserver, SingleTickerProviderStateMixin {
  static const Color _cream = EngoraColors.background;
  static const Color _black = EngoraColors.ink;
  static const Color _orange = EngoraColors.brand;
  static const Color _danger = EngoraColors.danger;

  late final AnimationController _pulsingController;
  final SpeechToText _speech = SpeechToText();
  final FlutterTts _tts = FlutterTts();
  final List<ConversationMessage> _messages = [];
  final List<AiResponse> _evaluationResults = [];
  final Set<Future<void>> _pendingEvaluations = {};
  final List<ConversationLatencyTrace> _latencyMetrics = [];
  final Set<String> _completedObjectiveIds = {};
  final PracticeHistoryStore _historyStore = const PracticeHistoryStore();
  late final String _sessionId = PracticeSession.createSessionId();
  late final DateTime _sessionStartedAt = DateTime.now().toUtc();

  CameraController? _cameraController;
  ChatService? _chatService;
  UserProfile? _profile;
  AvatarActivity _activity = AvatarActivity.loading;
  AiResponse? _lastResponse;
  late final AudioPlayer _audioPlayer;
  StreamSubscription<PlayerState>? _audioSubscription;
  StreamSubscription<Duration>? _positionSubscription;

  int _studentResponseCount = 0;
  bool _sessionLoading = true;
  bool _speechAvailable = false;
  bool _showSubtitles = true;
  bool _playbackBusy = false;
  ConversationMessage? _activeSubtitle;

  bool _cameraEnabled = true;
  bool _cameraInitializationInProgress = false;
  bool _submissionStarted = false;
  bool _reviewingTranscript = false;
  bool _navigatingToResult = false;
  AppLifecycleState _lifecycleState = AppLifecycleState.resumed;
  String _recognizedWords = '';
  List<String> _speechAlternatives = const [];
  double? _speechConfidence;
  final SpeechDraft _speechDraft = SpeechDraft();
  Timer? _speechEndTimer;
  Completer<void>? _speechFinal;
  bool _captureActive = false;
  final PendingTurn _pendingTurn = PendingTurn();
  bool get _requestInFlight => _pendingTurn.sending;
  String? get _pendingResponse => _pendingTurn.text;
  String? _cameraError;
  String? _sessionError;
  CoachingEvent? _activeCoachingEvent;
  Timer? _coachingTimer;
  ConversationLatencyDraft? _activeLatencyDraft;

  @override
  void initState() {
    super.initState();
    _pulsingController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    WidgetsBinding.instance.addObserver(this);
    _lifecycleState =
        WidgetsBinding.instance.lifecycleState ?? AppLifecycleState.resumed;

    _audioPlayer = AudioPlayer();
    _audioSubscription = _audioPlayer.onPlayerStateChanged.listen((
      PlayerState state,
    ) {
      if (!mounted) return;
      setState(() {
        if (state == PlayerState.playing) {
          _recordAudioPlaybackStart();
          _activity = AvatarActivity.speaking;
          if (_messages.isNotEmpty && _messages.last.speaker == 'AI') {
            _activeSubtitle = _messages.last;
          }
        } else if (state == PlayerState.completed ||
            state == PlayerState.stopped) {
          if (!_sessionLoading &&
              _sessionError == null &&
              !_captureActive &&
              _activity == AvatarActivity.speaking) {
            _activity = AvatarActivity.idle;
          }
        }
      });
    });

    _positionSubscription = _audioPlayer.onPositionChanged.listen((position) {
      if (!mounted) return;
      if (_activity == AvatarActivity.loading && position > Duration.zero) {
        _recordAudioPlaybackStart();
        setState(() {
          _activity = AvatarActivity.speaking;
          if (_messages.isNotEmpty && _messages.last.speaker == 'AI') {
            _activeSubtitle = _messages.last;
          }
        });
      }
    });

    unawaited(_initializeSession());
  }

  Future<void> _initializeSession() async {
    if (mounted) {
      setState(() {
        _sessionLoading = true;
        _sessionError = null;
        _activity = AvatarActivity.loading;
      });
    }

    final baseUrlFuture = AppSettings.getBaseUrl();
    final profileFuture = AuthService.getProfile();
    final baseUrl = await baseUrlFuture;
    _chatService = ChatService(baseUrl: baseUrl);
    _profile = await profileFuture;

    try {
      final openingFuture = _loadOpeningMessage();
      final ttsInitialization = _initializeTts();
      final captureInitialization = _initializeCaptureDevices();
      final openingMessage = await openingFuture;
      final openingAudio = _requestNeuralAudioUrl(openingMessage);
      await ttsInitialization;

      if (!mounted) return;
      setState(() {
        _messages
          ..clear()
          ..add(ConversationMessage(speaker: 'AI', message: openingMessage));
        _sessionLoading = false;
        _activity = AvatarActivity.loading;
        _activeSubtitle = _messages.last;
      });
      unawaited(captureInitialization);
      try {
        await _speak(openingMessage, preparedAudioUrl: openingAudio);
      } catch (_) {
        if (!mounted) return;
        setState(() => _activity = AvatarActivity.idle);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Opening audio is unavailable. You can replay it or continue with the text.',
            ),
          ),
        );
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _sessionLoading = false;
        _sessionError =
            'Cannot connect to the scenario server. Please check your internet connection or server status.\n\n$error';
        _activity = AvatarActivity.error;
      });
    }
  }

  Future<void> _initializeCaptureDevices() async {
    await _initializeSpeech();
    await _initializeCamera();
  }

  Future<String> _loadOpeningMessage() async {
    if (widget.experienceType == 'guided_topic') {
      final settingId = widget.settingId?.trim() ?? '';
      if (settingId.isEmpty) {
        throw StateError('A guided practice session requires a setting ID.');
      }
      final setting =
          widget.guidedSetting ??
          await _chatService!.getSettingDetail(settingId);
      return _sanitizeScenarioOpening(setting.buildOpeningMessage());
    }

    final scenarioData = await _chatService!.getScenario(widget.scenario.id);
    return _sanitizeScenarioOpening(
      scenarioData['initial_conversation_state']?['ai_opening_message'] ??
          scenarioData['conversation_flow']?[0]?['message'] ??
          'Hello. Shall we begin?',
    );
  }

  Future<void> _initializeCamera() async {
    if (!_cameraEnabled || _cameraInitializationInProgress || !mounted) return;
    _cameraInitializationInProgress = true;
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        throw CameraException('cameraUnavailable', 'No camera found.');
      }
      final rearCamera = cameras.firstWhere(
        (camera) => camera.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      final controller = CameraController(
        rearCamera,
        ResolutionPreset.high,
        enableAudio: false,
      );
      await controller.initialize();
      if (!mounted ||
          !_cameraEnabled ||
          _lifecycleState != AppLifecycleState.resumed) {
        await controller.dispose();
        return;
      }
      final previousController = _cameraController;
      setState(() {
        _cameraController = controller;
        _cameraError = null;
      });
      await previousController?.dispose();
    } on CameraException catch (error) {
      if (!mounted) return;
      setState(() {
        _cameraError = error.description ?? error.code;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _cameraError = error.toString();
      });
    } finally {
      _cameraInitializationInProgress = false;
    }
  }

  Future<void> _initializeSpeech() async {
    try {
      final available = await _speech.initialize(
        onStatus: _onSpeechStatus,
        onError: _onSpeechError,
      );
      if (mounted) {
        setState(() => _speechAvailable = available);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _speechAvailable = false);
      }
    }
  }

  Future<void> _initializeTts() async {
    try {
      await _tts.setLanguage('en-US');
      await _tts.setSpeechRate(0.5);
      final isMaleVoice = _voiceGender() == 'male';
      await _tts.setPitch(isMaleVoice ? 0.95 : 1.02);
      await _tts.setVolume(1.0);
      await _tts.awaitSpeakCompletion(true);

      _tts.setStartHandler(() {
        if (!mounted) return;
        _recordAudioPlaybackStart();
        setState(() {
          _activity = AvatarActivity.speaking;
          if (_messages.isNotEmpty && _messages.last.speaker == 'AI') {
            _activeSubtitle = _messages.last;
          }
        });
      });

      _tts.setCompletionHandler(() {
        if (!mounted ||
            _captureActive ||
            _activity != AvatarActivity.speaking) {
          return;
        }
        setState(() {
          _activity = AvatarActivity.idle;
        });
      });
    } catch (_) {}
  }

  String _voiceGender() {
    final settingId =
        (widget.settingId ?? widget.guidedSetting?.settingId ?? '')
            .toUpperCase();
    if (settingId == 'PROFESSIONAL-INTERVIEW-ROOM' ||
        settingId == 'PROFESSIONAL-CAREER-FAIR') {
      return 'male';
    }
    if (settingId == 'SOCIAL-MELBOURNE-CAFE' ||
        settingId == 'SOCIAL-LONDON-RESTAURANT' ||
        settingId == 'ACADEMIC-LECTURER-OFFICE' ||
        settingId == 'ACADEMIC-AFTER-CLASS') {
      return 'female';
    }

    if (widget.guidedSetting != null) {
      final character = widget.guidedSetting!.aiCharacter;
      final nameLower = character.displayName.toLowerCase();
      final roleLower = character.role.toLowerCase();
      final avatarLower = character.avatarKey.toLowerCase();

      if (nameLower.contains('michael') ||
          roleLower.contains('michael') ||
          avatarLower.contains('hr_manager')) {
        return 'male';
      }
      if (nameLower.contains('olivia') ||
          nameLower.contains('emma') ||
          nameLower.contains('sarah') ||
          avatarLower.contains('waitress') ||
          avatarLower.contains('barista')) {
        return 'female';
      }
    }

    final scenarioId = widget.scenario.id.toUpperCase();
    if (scenarioId == 'G-ICC-008' || scenarioId == 'N-ICC-005') {
      return 'male';
    }

    final aiRoleLower = widget.scenario.aiRole.toLowerCase();
    if (aiRoleLower.contains('david') ||
        aiRoleLower.contains('michael') ||
        aiRoleLower.contains('mr.') ||
        aiRoleLower.contains('male') ||
        RegExp(r'\bman\b').hasMatch(aiRoleLower)) {
      return 'male';
    }
    return 'female';
  }

  Future<String?> _requestNeuralAudioUrl(String text) async {
    final service = _chatService;
    if (service == null) return null;
    return TtsAudioService.shared.request(service.baseUrl, {
      'text': text,
      'gender': _voiceGender(),
      'ai_role': widget.scenario.aiRole,
      'experience_type': widget.experienceType,
      'scenario_id': widget.scenario.id,
      if (widget.settingId != null) 'setting_id': widget.settingId!,
    });
  }

  Future<void> _speak(String text, {Future<String?>? preparedAudioUrl}) async {
    if (_playbackBusy) return;
    _playbackBusy = true;
    try {
      await _playSpeech(text, preparedAudioUrl: preparedAudioUrl);
    } finally {
      _playbackBusy = false;
      if (mounted) setState(() {});
    }
  }

  Future<void> _playSpeech(
    String text, {
    Future<String?>? preparedAudioUrl,
  }) async {
    if (text.trim().isEmpty || !mounted) {
      if (mounted) setState(() => _activity = AvatarActivity.idle);
      return;
    }

    final audioRequest = preparedAudioUrl ?? _requestNeuralAudioUrl(text);
    setState(() => _activity = AvatarActivity.loading);
    // Prepare audio while stopping the previous capture and playback.
    try {
      await _speech.stop();
      await _tts.stop();
      await _audioPlayer.stop();
    } catch (_) {}

    if (!mounted || _navigatingToResult) return;
    setState(() {
      _activity = AvatarActivity.loading;
      if (_messages.isNotEmpty && _messages.last.speaker == 'AI') {
        _activeSubtitle = _messages.last;
      }
    });

    bool success = false;
    try {
      final url = await audioRequest;
      if (!mounted || _navigatingToResult) return;
      if (url != null && url.isNotEmpty) {
        _markTtsReady('neural');
        await _audioPlayer
            .play(UrlSource(url))
            .timeout(const Duration(seconds: 5));
        success = true;
      }
    } catch (error) {
      debugPrint('Unable to play neural TTS audio. Error: $error');
      await _audioPlayer.stop();
    }

    if (!success) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Using device voice. The AI voice is temporarily unavailable.',
          ),
        ),
      );
      setState(() {
        _activity = AvatarActivity.loading;
        if (_messages.isNotEmpty && _messages.last.speaker == 'AI') {
          _activeSubtitle = _messages.last;
        }
      });
      try {
        await _tts.stop();
        final isMaleVoice = _voiceGender() == 'male';
        await _tts.setPitch(isMaleVoice ? 0.95 : 1.02);
        _markTtsReady('local');
        await _tts.speak(text).timeout(const Duration(seconds: 60));
      } catch (_) {
        _activeLatencyDraft = null;
        await _tts.stop();
        rethrow;
      } finally {
        if (mounted && !_sessionLoading && _sessionError == null) {
          setState(() => _activity = AvatarActivity.idle);
        }
      }
    }
  }

  void _markTtsReady(String source) {
    final draft = _activeLatencyDraft;
    if (draft == null || draft.completed) return;
    draft
      ..ttsReadyAt = DateTime.now().toUtc()
      ..audioSource = source;
  }

  void _recordAudioPlaybackStart() {
    final draft = _activeLatencyDraft;
    if (draft == null) return;
    final trace = draft.complete(DateTime.now().toUtc());
    if (trace == null) return;
    _latencyMetrics.add(trace);
    _activeLatencyDraft = null;
    debugPrint(
      'Phase10 latency turn=${trace.turnNumber} '
      'first_audio_ms=${trace.firstAudioLatencyMs} '
      'ai_text_ms=${trace.aiTextLatencyMs} source=${trace.audioSource}',
    );
  }

  Future<void> _toggleListening() async {
    if (_playbackBusy ||
        _submissionStarted ||
        _reviewingTranscript ||
        _requestInFlight ||
        _sessionLoading ||
        _sessionError != null ||
        _activity == AvatarActivity.loading ||
        _activity == AvatarActivity.thinking ||
        _activity == AvatarActivity.speaking) {
      return;
    }

    if (_pendingResponse != null) {
      await _submitResponse(_pendingResponse!);
      return;
    }

    if (!_speechAvailable) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              "Microphone is required for this practice. Please enable microphone permissions in your settings.",
            ),
          ),
        );
      }
      return;
    }

    if (_captureActive) {
      _pulsingController.stop();
      await _stopListeningAndReview();
      return;
    }

    await _startListening();
  }

  Future<void> _startListening({String retainedText = ''}) async {
    if (_playbackBusy ||
        !_speechAvailable ||
        _captureActive ||
        _reviewingTranscript ||
        _sessionLoading ||
        _activity == AvatarActivity.speaking ||
        _requestInFlight ||
        _pendingResponse != null ||
        !mounted) {
      return;
    }
    _speechEndTimer?.cancel();
    _speechFinal = Completer<void>();
    _submissionStarted = false;
    _captureActive = true;
    _speechDraft.start(retainedText: retainedText);
    setState(() {
      _recognizedWords = _speechDraft.text;
      _speechAlternatives = const [];
      _speechConfidence = null;
      _reviewingTranscript = false;
      _activity = AvatarActivity.listening;
    });

    _pulsingController.repeat(reverse: true);

    try {
      await _tts.stop();
      await _audioPlayer.stop();
      if (!mounted) return;
      setState(() => _activity = AvatarActivity.listening);
      await _speech.listen(
        onResult: _onSpeechResult,
        listenOptions: SpeechListenOptions(
          localeId: 'en_US',
          listenMode: ListenMode.dictation,
          partialResults: true,
          cancelOnError: false,
          onDevice: false,
          autoPunctuation: true,
          pauseFor: const Duration(seconds: 6),
          listenFor: const Duration(seconds: 60),
        ),
      );
      if (!_speech.isListening && _captureActive) _scheduleSpeechReview();
    } catch (_) {
      _scheduleSpeechReview();
    }
  }

  void _onSpeechResult(SpeechRecognitionResult result) {
    if (!mounted || !_captureActive) return;
    _speechEndTimer?.cancel();
    if (!result.finalResult && (_speechFinal?.isCompleted ?? false)) {
      _speechFinal = Completer<void>();
    }
    final current = result.recognizedWords.trim();
    if (current.isEmpty) return;

    final accumulatedPrefix = _speechDraft.prefix;
    _speechDraft.update(current, isFinal: result.finalResult);

    final alternatives = buildTranscriptAlternatives(
      primary: current,
      alternatives: result.alternates
          .skip(1)
          .map((alternate) => alternate.recognizedWords),
      accumulatedPrefix: accumulatedPrefix,
    );

    setState(() {
      _recognizedWords = _speechDraft.text;
      _speechAlternatives = alternatives;
      _speechConfidence = result.hasConfidenceRating ? result.confidence : null;
    });
    if (result.finalResult) {
      if (!(_speechFinal?.isCompleted ?? true)) _speechFinal!.complete();
      _scheduleSpeechReview();
    }
  }

  void _scheduleSpeechReview() {
    if (!_captureActive || !mounted) return;
    _speechEndTimer?.cancel();
    // Android can signal notListening before delivering its final transcript.
    _speechEndTimer = Timer(const Duration(milliseconds: 1200), () {
      if (mounted && _captureActive) unawaited(_stopListeningAndReview());
    });
  }

  void _onSpeechStatus(String status) {
    if (!mounted || !_captureActive || _submissionStarted) return;
    if ((status == SpeechToText.doneStatus ||
            status == SpeechToText.notListeningStatus) &&
        _activity == AvatarActivity.listening) {
      _scheduleSpeechReview();
    }
  }

  void _onSpeechError(SpeechRecognitionError error) {
    if (!mounted || !_captureActive || _submissionStarted) return;
    if (_recognizedWords.trim().isNotEmpty) {
      _scheduleSpeechReview();
      return;
    }
    _speechEndTimer?.cancel();
    _captureActive = false;
    _pulsingController.stop();
    setState(() {
      _activity = AvatarActivity.idle;
      _submissionStarted = false;
      _reviewingTranscript = false;
    });
    final noSpeech =
        error.errorMsg == 'error_speech_timeout' ||
        error.errorMsg == 'error_no_match';
    final userFriendlyMessage = noSpeech
        ? 'No clear speech was detected. Please try again.'
        : 'Microphone: ${error.errorMsg}';

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(userFriendlyMessage),
        action: noSpeech
            ? SnackBarAction(
                label: 'Retry',
                onPressed: () => unawaited(_startListening()),
              )
            : null,
      ),
    );
  }

  Future<void> _stopListeningAndReview() async {
    _pulsingController.stop();
    if (_submissionStarted) return;
    _submissionStarted = true;
    _speechEndTimer?.cancel();
    try {
      await _speech.stop();
      await _speechFinal?.future.timeout(
        SpeechToText.defaultFinalTimeout + const Duration(milliseconds: 100),
        onTimeout: () {},
      );
    } catch (_) {}
    _speechEndTimer?.cancel();
    if (!mounted) return;
    _captureActive = false;
    _submissionStarted = false;
    final words = _recognizedWords.trim();
    if (words.isEmpty) {
      if (mounted) setState(() => _activity = AvatarActivity.idle);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'No speech was captured. Tap the microphone to try again.',
          ),
        ),
      );
      return;
    }
    await _reviewTranscriptAndSubmit(
      words,
      speechFinalAt: DateTime.now().toUtc(),
    );
  }

  Future<void> _reviewTranscriptAndSubmit(
    String words, {
    required DateTime speechFinalAt,
  }) async {
    if (_submissionStarted || !mounted) return;
    _submissionStarted = true;
    _captureActive = false;
    _pulsingController.stop();
    if (!mounted) return;

    final controller = TextEditingController(text: words);
    final candidates = buildTranscriptAlternatives(
      primary: words,
      alternatives: _speechAlternatives,
    );
    setState(() {
      _activity = AvatarActivity.idle;
      _reviewingTranscript = true;
    });

    var continueSpeaking = false;
    final confirmedText = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      enableDrag: false,
      isDismissible: false,
      useSafeArea: true,
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            20,
            20,
            20 + MediaQuery.viewInsetsOf(context).bottom,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Did we hear that correctly?',
                        style: TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    if (_speechConfidence != null && _speechConfidence! < 0.75)
                      const Tooltip(
                        message: 'Speech recognition confidence is low',
                        child: Icon(
                          Icons.hearing_disabled_rounded,
                          color: EngoraColors.danger,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Check the transcript before it is sent to your conversation partner.',
                  style: TextStyle(color: EngoraColors.muted),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: controller,
                  minLines: 2,
                  maxLines: 4,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: const InputDecoration(
                    labelText: 'Your response',
                    hintText: 'Edit any words that were heard incorrectly',
                    prefixIcon: Icon(Icons.graphic_eq_rounded),
                  ),
                  onChanged: (_) => setModalState(() {}),
                ),
                if (candidates.length > 1) ...[
                  const SizedBox(height: 14),
                  const Text(
                    'Other possibilities',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                  const SizedBox(height: 8),
                  Column(
                    children: candidates.skip(1).map((candidate) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            icon: const Icon(
                              Icons.text_fields_rounded,
                              size: 18,
                            ),
                            label: Text(
                              candidate,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            onPressed: () {
                              controller.text = candidate;
                              controller.selection = TextSelection.collapsed(
                                offset: controller.text.length,
                              );
                              setModalState(() {});
                            },
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
                const SizedBox(height: 20),
                TextButton.icon(
                  icon: const Icon(Icons.mic_rounded),
                  label: const Text('Continue speaking'),
                  onPressed: () {
                    continueSpeaking = true;
                    Navigator.pop(sheetContext, controller.text.trim());
                  },
                ),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          FocusScope.of(sheetContext).unfocus();
                          Navigator.pop(sheetContext);
                        },
                        icon: const Icon(Icons.replay_rounded),
                        label: const Text('Try again'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: controller.text.trim().isEmpty
                            ? null
                            : () {
                                FocusScope.of(sheetContext).unfocus();
                                Navigator.pop(
                                  sheetContext,
                                  controller.text.trim(),
                                );
                              },
                        icon: const Icon(Icons.send_rounded),
                        label: const Text('Send'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
    controller.dispose();
    if (!mounted) return;
    setState(() => _reviewingTranscript = false);

    if (continueSpeaking) {
      _submissionStarted = false;
      await _startListening(retainedText: confirmedText ?? words);
      return;
    }

    if (confirmedText == null) {
      _submissionStarted = false;
      await _startListening();
      return;
    }

    await _submitResponse(confirmedText, speechFinalAt: speechFinalAt);
  }

  Future<void> _submitResponse(String text, {DateTime? speechFinalAt}) async {
    if (_requestInFlight ||
        text.trim().isEmpty ||
        _chatService == null ||
        !mounted) {
      return;
    }
    if (!_pendingTurn.begin(text)) return;
    _submissionStarted = true;
    var responseAccepted = false;
    _pulsingController.stop();

    setState(() {
      _recognizedWords = text;
      _activeSubtitle = ConversationMessage(speaker: 'Student', message: text);
      _activity = AvatarActivity.thinking;
    });
    final thinkingVisibleAt = DateTime.now().toUtc();

    try {
      final history = _messages
          .map(
            (message) => {
              'speaker': message.speaker,
              'message': message.message,
            },
          )
          .toList();
      final turnNumber = _studentResponseCount + 1;
      final chatRequestStartedAt = DateTime.now().toUtc();
      _activeLatencyDraft = ConversationLatencyDraft(
        turnNumber: turnNumber,
        speechFinalAt: (speechFinalAt ?? thinkingVisibleAt).toUtc(),
        thinkingVisibleAt: thinkingVisibleAt,
        chatRequestStartedAt: chatRequestStartedAt,
      );
      final result = await _chatService!.respondTurn(
        sessionId: _sessionId,
        scenarioId: widget.scenario.id,
        topicId: widget.topicId,
        settingId: widget.settingId,
        studentResponseCount: turnNumber,
        conversationHistory: history,
        studentResponse: text,
        studentDisplayName: _profile?.name,
        studentId: _profile?.studentId,
        completedObjectiveIds: _completedObjectiveIds.toList(growable: false),
      );
      final aiTextReceivedAt = DateTime.now().toUtc();
      if (_activeLatencyDraft?.turnNumber == turnNumber) {
        _activeLatencyDraft!.aiTextReceivedAt = aiTextReceivedAt;
      }

      if (!mounted) return;
      responseAccepted = true;
      setState(() {
        _pendingTurn.accept();
        _recognizedWords = '';
        _messages.add(ConversationMessage(speaker: 'Student', message: text));
        _lastResponse = result;
        _completedObjectiveIds.addAll(result.completedObjectiveIds);
        _evaluationResults.add(result);
        final aiMessage = ConversationMessage(
          speaker: 'AI',
          message: result.aiMessage,
        );
        _messages.add(aiMessage);
        _activeSubtitle = aiMessage;
        _studentResponseCount++;
      });

      _triggerCoachingBanner(result.coachingEvent);

      final audioRequest = _requestNeuralAudioUrl(result.aiMessage);

      late final Future<void> evaluation;
      evaluation = _refreshTurnEvaluation(
        turnNumber: turnNumber,
        history: history,
        studentResponse: text,
        completedObjectiveIds: _completedObjectiveIds.toList(growable: false),
      ).whenComplete(() => _pendingEvaluations.remove(evaluation));
      _pendingEvaluations.add(evaluation);
      unawaited(evaluation);
      await _speak(result.aiMessage, preparedAudioUrl: audioRequest);
    } catch (error) {
      if (!mounted) return;
      setState(() => _activity = AvatarActivity.idle);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            responseAccepted
                ? 'Your response was received, but audio could not play.'
                : 'Your response is saved here. Check your connection and tap Retry.',
          ),
          action: responseAccepted
              ? null
              : SnackBarAction(
                  label: 'Retry',
                  onPressed: () {
                    if (_pendingResponse != text || _requestInFlight) return;
                    unawaited(
                      _submitResponse(
                        text,
                        speechFinalAt: DateTime.now().toUtc(),
                      ),
                    );
                  },
                ),
        ),
      );
    } finally {
      _pendingTurn.finishAttempt();
      _submissionStarted = false;
      if (mounted) setState(() {});
    }
  }

  Future<void> _refreshTurnEvaluation({
    required int turnNumber,
    required List<Map<String, String>> history,
    required String studentResponse,
    required List<String> completedObjectiveIds,
  }) async {
    if (_chatService == null) return;
    try {
      final detailedResult = await _chatService!.evaluateTurn(
        sessionId: _sessionId,
        scenarioId: widget.scenario.id,
        topicId: widget.topicId,
        settingId: widget.settingId,
        studentResponseCount: turnNumber,
        conversationHistory: history,
        studentResponse: studentResponse,
        studentDisplayName: _profile?.name,
        studentId: _profile?.studentId,
        completedObjectiveIds: completedObjectiveIds,
      );
      if (!mounted) return;
      setState(() {
        _completedObjectiveIds.addAll(detailedResult.completedObjectiveIds);
        final index = _evaluationResults.indexWhere(
          (item) => item.turnNumber == turnNumber,
        );
        if (index >= 0) {
          _evaluationResults[index] = detailedResult;
        } else {
          _evaluationResults.add(detailedResult);
        }
        if (_lastResponse?.turnNumber == turnNumber) {
          _lastResponse = detailedResult;
        }
      });
    } catch (error) {
      debugPrint('Background scoring failed: $error');
    }
  }

  Future<void> _requestManualFinish() async {
    if (_playbackBusy ||
        _requestInFlight ||
        _captureActive ||
        _reviewingTranscript ||
        _pendingResponse != null) {
      return;
    }
    if (_lastResponse == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Give at least one response first.')),
      );
      return;
    }
    final shouldFinish = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('End practice manually?'),
        content: Text(
          _completionEligible
              ? 'All objectives are complete. You can also use the completion button to record this practice as completed.'
              : 'Some objectives are still incomplete. This practice will be recorded as Ended Manually.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Continue'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('End manually'),
          ),
        ],
      ),
    );
    if (shouldFinish == true && mounted) {
      await _openResult(completedByObjectives: false);
    }
  }

  Future<void> _requestObjectiveFinish() async {
    if (_playbackBusy ||
        _requestInFlight ||
        _captureActive ||
        _reviewingTranscript ||
        _pendingResponse != null) {
      return;
    }
    if (!_completionEligible || _lastResponse == null) return;
    final shouldFinish = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Complete practice?'),
        content: const Text(
          'You have completed every objective. Your result and conversation feedback are ready.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep practicing'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(context, true),
            icon: const Icon(Icons.check_rounded),
            label: const Text('Complete practice'),
          ),
        ],
      ),
    );
    if (shouldFinish == true && mounted) {
      await _openResult(completedByObjectives: true);
    }
  }

  Future<void> _openResult({required bool completedByObjectives}) async {
    if (_lastResponse == null || _navigatingToResult) return;
    _navigatingToResult = true;
    setState(() {});
    try {
      await Future.wait(
        _pendingEvaluations.toList(),
      ).timeout(const Duration(seconds: 12));
    } on TimeoutException {
      // Missing evaluations remain unscored; never substitute fallback scores.
    }
    if (!mounted) return;
    _captureActive = false;
    _speechEndTimer?.cancel();
    await _speech.stop();
    await _tts.stop();
    if (!mounted) return;
    final history = _messages
        .map(
          (message) => {
            'speaker': message.speaker,
            'message': message.message,
            'confirmed': (message.speaker == 'Student').toString(),
          },
        )
        .toList();
    final pilotMetadata = await PilotEvidenceService.capture(context);
    if (!mounted) return;
    final session = PracticeSession.fromPractice(
      sessionId: _sessionId,
      scenario: widget.scenario,
      startedAt: _sessionStartedAt,
      completedAt: DateTime.now().toUtc(),
      transcript: history,
      evaluations: List.unmodifiable(_evaluationResults),
      studentId: _profile?.studentId.isNotEmpty == true
          ? _profile!.studentId
          : 'local_student',
      studentName: _profile?.name,
      experienceType: widget.experienceType,
      topicId: widget.topicId,
      topicTitle: widget.topicTitle,
      settingId: widget.settingId,
      settingTitle: widget.settingTitle,
      avatarKey: widget.avatarKey,
      launchSource: widget.launchSource,
      moduleId: widget.moduleId,
      unitId: widget.unitId,
      pageId: widget.pageId,
      latencyMetrics: List.unmodifiable(_latencyMetrics),
      pilotMetadata: pilotMetadata,
      completedByObjectives: completedByObjectives,
    );
    await _historyStore.saveSession(session);
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => ResultScreen(
          scenario: widget.scenario,
          finalResponse: _lastResponse!,
          evaluationResults: _evaluationResults,
          conversationHistory: history,
          latencyMetrics: List.unmodifiable(_latencyMetrics),
          session: session,
        ),
      ),
    );
  }

  Future<void> _confirmExit() async {
    // Unfocus keyboard first to prevent layout crash with O3D webview on pop
    FocusScope.of(context).unfocus();

    if (_evaluationResults.isEmpty &&
        _pendingResponse == null &&
        !_captureActive &&
        !_requestInFlight) {
      if (mounted) Navigator.pop(context);
      return;
    }
    final shouldExit = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Leave this session?'),
        content: const Text('The current practice result will not be saved.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Stay'),
          ),
          FilledButton.tonal(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Leave'),
          ),
        ],
      ),
    );
    if (shouldExit == true && mounted) {
      FocusScope.of(context).unfocus();
      Navigator.pop(context);
    }
  }

  Future<void> _toggleCamera() async {
    // Dismiss keyboard before camera rebuild to prevent O3D webview layout collision
    FocusScope.of(context).unfocus();

    if (_cameraEnabled) {
      final controller = _cameraController;
      if (mounted) {
        setState(() {
          _cameraController = null;
          _cameraEnabled = false;
        });
      }
      await controller?.dispose();
    } else {
      setState(() => _cameraEnabled = true);
      await _initializeCamera();
    }
  }

  void _showTranscript() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          itemCount: _messages.length,
          separatorBuilder: (_, __) => const Divider(height: 20),
          itemBuilder: (context, index) {
            final message = _messages[index];
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  message.speaker,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(message.message),
              ],
            );
          },
        ),
      ),
    );
  }

  bool get _completionEligible => _lastResponse?.completionEligible == true;

  Widget _buildObjectiveCompletionPanel() {
    if (!_completionEligible) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
      decoration: BoxDecoration(
        color: EngoraColors.professionalAccent.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: EngoraColors.professionalAccent.withValues(alpha: 0.35),
        ),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.verified_rounded,
            color: EngoraColors.professionalAccent,
            size: 24,
          ),
          const SizedBox(width: 10),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Objectives complete',
                  style: TextStyle(
                    color: EngoraColors.ink,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'You can complete the practice now or keep talking.',
                  style: TextStyle(color: EngoraColors.muted, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: _requestObjectiveFinish,
            style: FilledButton.styleFrom(
              backgroundColor: EngoraColors.professionalAccent,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              minimumSize: const Size(0, 42),
            ),
            child: const Text('Complete'),
          ),
        ],
      ),
    );
  }

  String get _statusLabel {
    if (_navigatingToResult) return 'Finalizing assessment';
    if (_reviewingTranscript) return 'Review transcript';
    if (_pendingResponse != null && !_requestInFlight) {
      return 'Response kept in this session - retry';
    }
    final activityLabel = switch (_activity) {
      AvatarActivity.loading =>
        _sessionLoading ? 'Preparing session' : 'AI is preparing to speak',
      AvatarActivity.idle =>
        _speechAvailable ? 'Tap to speak' : 'Type response',
      AvatarActivity.listening => 'Listening',
      AvatarActivity.thinking => 'Preparing response',
      AvatarActivity.speaking => 'Speaking',
      AvatarActivity.error => 'Connection needed',
    };
    if (_sessionLoading || _sessionError != null) return activityLabel;

    final progress = _lastResponse?.sessionProgress ?? const {};
    final completed =
        (progress['completed_objective_ids'] as List<dynamic>?)?.length ?? 0;
    final remaining =
        (progress['remaining_objective_ids'] as List<dynamic>?)?.length ?? 0;
    final objectiveProgress = completed + remaining > 0
        ? ' | Goals $completed/${completed + remaining}'
        : '';
    return '$activityLabel | Response $_studentResponseCount$objectiveProgress';
  }

  void _triggerCoachingBanner(CoachingEvent? event) {
    if (event == null) return;
    _coachingTimer?.cancel();
    setState(() {
      _activeCoachingEvent = event;
    });
    _coachingTimer = Timer(const Duration(seconds: 6), () {
      if (mounted) {
        setState(() {
          _activeCoachingEvent = null;
        });
      }
    });
  }

  Widget _buildCoachingBanner() {
    final event = _activeCoachingEvent;
    if (event == null) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: _cream.withValues(alpha: 0.96),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _orange.withValues(alpha: 0.45)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: _orange.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.lightbulb_outline_rounded,
              color: _orange,
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'PRAGMATIC TIP',
                      style: TextStyle(
                        color: _orange,
                        fontWeight: FontWeight.w800,
                        fontSize: 11,
                        letterSpacing: 0,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => setState(() => _activeCoachingEvent = null),
                      child: const Icon(
                        Icons.close_rounded,
                        color: EngoraColors.muted,
                        size: 16,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  event.shortHint,
                  style: const TextStyle(
                    color: _black,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildThinkingIndicator() {
    if (_activity != AvatarActivity.thinking) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: _cream,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: _black.withValues(alpha: 0.12)),
        boxShadow: [
          BoxShadow(
            color: _black.withValues(alpha: 0.10),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox.square(
            dimension: 14,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: _black.withValues(alpha: 0.7),
            ),
          ),
          const SizedBox(width: 10),
          Text(
            'Preparing response...',
            style: TextStyle(
              color: _black.withValues(alpha: 0.72),
              fontSize: 13,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }

  String get _modelPath {
    return AvatarRegistry.modelPathFor(
      avatarKey: widget.avatarKey,
      aiRole: widget.scenario.aiRole,
      experienceType: widget.experienceType,
    );
  }

  String _sanitizeScenarioOpening(String text) {
    final displayName = _profile?.name.trim() ?? '';
    var cleaned = text.trim();

    cleaned = cleaned
        .replaceAll(
          RegExp(r'\bAre you (Rina|Raka)\b', caseSensitive: false),
          displayName.isNotEmpty
              ? 'Are you $displayName'
              : 'Are you the student volunteer',
        )
        .replaceAll(
          RegExp(r'\bHi, (Rina|Raka|David)\b', caseSensitive: false),
          displayName.isNotEmpty ? 'Hi, $displayName' : 'Hi',
        )
        .replaceAll(
          RegExp(r'\bThank you, (Rina|Raka|David)\b', caseSensitive: false),
          displayName.isNotEmpty ? 'Thank you, $displayName' : 'Thank you',
        )
        .replaceAll(
          RegExp(r"\bI\s*(am|'m)\s+David\s+from\b", caseSensitive: false),
          'I am an exchange student from',
        )
        .replaceAll(
          RegExp(r"\bI\s*(am|'m)\s+David\b", caseSensitive: false),
          'I am an exchange student',
        )
        .replaceAll(RegExp(r',\s*(Rina|Raka|David)\b'), '')
        .replaceAll(RegExp(r'\s{2,}'), ' ');

    return cleaned;
  }

  Widget _buildCameraBackground() {
    final controller = _cameraController;
    if (!_cameraEnabled ||
        controller == null ||
        !controller.value.isInitialized) {
      return ColoredBox(
        color: _cream,
        child: Center(
          child: Icon(
            _cameraError == null
                ? Icons.videocam_off_outlined
                : Icons.no_photography_outlined,
            color: _black.withValues(alpha: 0.35),
            size: 48,
          ),
        ),
      );
    }

    final previewSize = controller.value.previewSize;
    if (previewSize == null) return const SizedBox.shrink();
    final displaySize = cameraPreviewDisplaySize(
      previewSize,
      MediaQuery.orientationOf(context),
    );

    return Center(
      child: FittedBox(
        fit: BoxFit.contain,
        child: SizedBox(
          width: displaySize.width,
          height: displaySize.height,
          child: CameraPreview(controller),
        ),
      ),
    );
  }

  Widget _buildIconButton({
    required String tooltip,
    required Widget icon,
    required VoidCallback? onPressed,
  }) {
    return IconButton(
      tooltip: tooltip,
      onPressed: onPressed,
      style: IconButton.styleFrom(
        backgroundColor: _cream,
        foregroundColor: _black,
        disabledBackgroundColor: _cream.withValues(alpha: 0.7),
        disabledForegroundColor: _black.withValues(alpha: 0.35),
        side: BorderSide(color: _black.withValues(alpha: 0.08)),
        shape: const CircleBorder(),
        minimumSize: const Size(48, 48),
      ),
      icon: icon,
    );
  }

  Widget _buildSubtitle() {
    if (!_showSubtitles) return const SizedBox.shrink();
    final isListening = _activity == AvatarActivity.listening;
    final displayMessage = isListening && _recognizedWords.isNotEmpty
        ? ConversationMessage(speaker: 'You', message: _recognizedWords)
        : _activeSubtitle;
    if (displayMessage == null) return const SizedBox.shrink();
    return Container(
      constraints: const BoxConstraints(maxWidth: 520, minHeight: 58),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: _cream,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _black.withValues(alpha: 0.12)),
        boxShadow: [
          BoxShadow(
            color: _black.withValues(alpha: 0.12),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            displayMessage.speaker,
            style: TextStyle(
              color: _black.withValues(alpha: 0.58),
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            displayMessage.message,
            maxLines: 4,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: _black,
              fontSize: 15,
              fontWeight: FontWeight.w600,
              height: 1.35,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorPanel() {
    if (_sessionError == null) return const SizedBox.shrink();
    return Center(
      child: Container(
        margin: const EdgeInsets.all(24),
        padding: const EdgeInsets.all(18),
        constraints: const BoxConstraints(maxWidth: 430),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFA),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_outlined, size: 38),
            const SizedBox(height: 12),
            Text(_sessionError!, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _initializeSession,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final canInteract =
        !_navigatingToResult &&
        !_playbackBusy &&
        !_requestInFlight &&
        !_submissionStarted &&
        !_reviewingTranscript &&
        !_sessionLoading &&
        _sessionError == null &&
        _activity != AvatarActivity.thinking &&
        _activity != AvatarActivity.speaking &&
        _activity != AvatarActivity.loading;

    return PopScope(
      canPop:
          _evaluationResults.isEmpty &&
          _pendingResponse == null &&
          !_captureActive &&
          !_requestInFlight,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) unawaited(_confirmExit());
      },
      child: Scaffold(
        backgroundColor: _cream,
        body: Stack(
          fit: StackFit.expand,
          children: [
            _buildCameraBackground(),
            if (_sessionError == null &&
                (widget.stickerAssetKey ?? '').isNotEmpty)
              Positioned(
                left: 12,
                right: 12,
                top: 120,
                bottom: 165,
                child: IgnorePointer(
                  child: SettingVisual(
                    stickerKey: widget.stickerAssetKey!,
                    label: widget.scenario.title,
                    borderRadius: 0,
                    showLabel: false,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            if (_sessionError == null)
              Positioned(
                left: 0,
                right: 0,
                top: 105,
                bottom: 145,
                child: Center(
                  child: AspectRatio(
                    aspectRatio: 0.7,
                    child: ArAvatar3d(
                      modelPath: _modelPath,
                      activity: _activity,
                    ),
                  ),
                ),
              ),
            SafeArea(
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(14, 8, 14, 14),
                    decoration: const BoxDecoration(
                      color: _cream,
                      borderRadius: BorderRadius.vertical(
                        bottom: Radius.circular(22),
                      ),
                    ),
                    child: Row(
                      children: [
                        _buildIconButton(
                          tooltip: 'Back',
                          icon: const AppSvgIcon(AppIcons.back, size: 24),
                          onPressed: _confirmExit,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            widget.topicTitle ?? widget.scenario.type,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: _black,
                              fontWeight: FontWeight.w600,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        PopupMenuButton<String>(
                          tooltip: 'Practice options',
                          color: _cream,
                          onSelected: (value) {
                            if (value == 'subtitles') {
                              setState(() => _showSubtitles = !_showSubtitles);
                            } else if (value == 'transcript' &&
                                _messages.isNotEmpty) {
                              _showTranscript();
                            }
                          },
                          itemBuilder: (_) => [
                            PopupMenuItem(
                              value: 'subtitles',
                              child: Text(
                                _showSubtitles
                                    ? 'Hide subtitles'
                                    : 'Show subtitles',
                              ),
                            ),
                            PopupMenuItem(
                              value: 'transcript',
                              enabled: _messages.isNotEmpty,
                              child: const Text('View transcript'),
                            ),
                          ],
                          icon: const Icon(Icons.more_horiz_rounded),
                          style: IconButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: _black,
                            minimumSize: const Size(48, 48),
                          ),
                        ),
                      ],
                    ),
                  ),
                  _buildCoachingBanner(),
                  const Spacer(),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: _buildThinkingIndicator(),
                  ),
                  if (_sessionError == null)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Align(
                        alignment: Alignment.center,
                        child: _buildSubtitle(),
                      ),
                    ),
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(24, 12, 24, 16),
                    decoration: const BoxDecoration(
                      color: _cream,
                      borderRadius: BorderRadius.vertical(
                        top: Radius.circular(22),
                      ),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _buildObjectiveCompletionPanel(),
                        Text(
                          _statusLabel,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: EngoraColors.muted,
                            fontWeight: FontWeight.w500,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildIconButton(
                              tooltip: _cameraEnabled
                                  ? 'Turn camera off'
                                  : 'Turn camera on',
                              icon: _cameraEnabled
                                  ? const AppSvgIcon(AppIcons.camera, size: 24)
                                  : const Icon(Icons.videocam_off_outlined),
                              onPressed: _toggleCamera,
                            ),
                            Semantics(
                              button: true,
                              label: _speech.isListening
                                  ? 'Stop listening'
                                  : 'Start speaking',
                              child: AnimatedBuilder(
                                animation: _pulsingController,
                                builder: (context, child) {
                                  final pulse = _pulsingController.value;
                                  return SizedBox(
                                    width: 84,
                                    height: 84,
                                    child: Stack(
                                      alignment: Alignment.center,
                                      children: [
                                        if (_speech.isListening)
                                          Container(
                                            width: 62 + (pulse * 20),
                                            height: 62 + (pulse * 20),
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                              color: _danger.withValues(
                                                alpha: 0.35 * (1 - pulse),
                                              ),
                                            ),
                                          ),
                                        child!,
                                      ],
                                    ),
                                  );
                                },
                                child: IconButton.filled(
                                  tooltip: _pendingResponse != null
                                      ? 'Retry response'
                                      : _captureActive
                                      ? 'Stop listening'
                                      : 'Speak',
                                  onPressed: canInteract
                                      ? _toggleListening
                                      : null,
                                  style: IconButton.styleFrom(
                                    minimumSize: const Size(64, 64),
                                    backgroundColor: _speech.isListening
                                        ? _danger
                                        : _orange,
                                    foregroundColor: Colors.white,
                                    disabledBackgroundColor: EngoraColors.line,
                                    disabledForegroundColor: EngoraColors.muted,
                                  ),
                                  iconSize: 29,
                                  icon: _pendingResponse != null
                                      ? const Icon(Icons.refresh_rounded)
                                      : AppSvgIcon(
                                          _captureActive
                                              ? AppIcons.microphoneSlash
                                              : AppIcons.microphone,
                                          size: 28,
                                        ),
                                ),
                              ),
                            ),
                            _buildIconButton(
                              tooltip: 'Replay AI response',
                              icon: const Icon(Icons.volume_up_outlined),
                              onPressed:
                                  canInteract &&
                                      !_captureActive &&
                                      _pendingResponse == null &&
                                      _messages.any(
                                        (message) => message.speaker == 'AI',
                                      )
                                  ? () async {
                                      final message = _messages.lastWhere(
                                        (message) => message.speaker == 'AI',
                                      );
                                      try {
                                        await _speak(message.message);
                                      } catch (_) {
                                        if (!context.mounted) return;
                                        ScaffoldMessenger.of(
                                          context,
                                        ).showSnackBar(
                                          const SnackBar(
                                            content: Text(
                                              'Audio unavailable. Please read the response and try again.',
                                            ),
                                          ),
                                        );
                                      }
                                    }
                                  : null,
                            ),
                            _buildIconButton(
                              tooltip: 'End practice manually',
                              icon: const AppSvgIcon(AppIcons.finish, size: 24),
                              onPressed:
                                  _lastResponse == null ||
                                      !canInteract ||
                                      _captureActive ||
                                      _pendingResponse != null
                                  ? null
                                  : _requestManualFinish,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            _buildErrorPanel(),
          ],
        ),
      ),
    );
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _lifecycleState = state;
    if (state == AppLifecycleState.resumed) {
      if (_cameraEnabled &&
          !(_cameraController?.value.isInitialized ?? false)) {
        unawaited(_initializeCamera());
      }
      return;
    }

    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused) {
      final controller = _cameraController;
      if (controller == null) return;
      if (mounted) {
        setState(() => _cameraController = null);
      } else {
        _cameraController = null;
      }
      unawaited(controller.dispose());
    }
  }

  @override
  void dispose() {
    _captureActive = false;
    _speechEndTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_audioSubscription?.cancel());
    unawaited(_positionSubscription?.cancel());
    unawaited(_cameraController?.dispose());
    unawaited(_speech.cancel());
    unawaited(_tts.stop());
    _pulsingController.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }
}
