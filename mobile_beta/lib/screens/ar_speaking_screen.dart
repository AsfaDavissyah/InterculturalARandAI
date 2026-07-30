import 'dart:async';
import 'dart:convert';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:http/http.dart' as http;
import 'package:audioplayers/audioplayers.dart';
import 'package:speech_to_text/speech_recognition_error.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../models/ai_response.dart';
import '../models/practice_session.dart';
import '../models/scenario_topic.dart';
import '../services/app_settings.dart';
import '../services/auth_service.dart';
import '../services/chat_service.dart';
import '../services/practice_history_store.dart';
import '../widgets/ar_avatar.dart';
import '../widgets/ar_avatar_3d.dart';
import 'result_screen.dart';

Size cameraPreviewDisplaySize(Size previewSize, Orientation orientation) {
  return orientation == Orientation.portrait
      ? Size(previewSize.height, previewSize.width)
      : previewSize;
}

class ConversationMessage {
  final String speaker;
  final String message;

  const ConversationMessage({required this.speaker, required this.message});
}

class ArSpeakingScreen extends StatefulWidget {
  final ScenarioTopic scenario;

  const ArSpeakingScreen({super.key, required this.scenario});

  @override
  State<ArSpeakingScreen> createState() => _ArSpeakingScreenState();
}

class _ArSpeakingScreenState extends State<ArSpeakingScreen>
    with WidgetsBindingObserver, SingleTickerProviderStateMixin {
  static const Color _cream = Color(0xFFFFFCF4);
  static const Color _black = Color(0xFF000000);
  static const Color _orange = Color(0xFFD4842A);
  static const Color _danger = Color(0xFFD54343);

  late final AnimationController _pulsingController;
  final SpeechToText _speech = SpeechToText();
  final FlutterTts _tts = FlutterTts();
  final List<ConversationMessage> _messages = [];
  final List<AiResponse> _evaluationResults = [];
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
  ConversationMessage? _activeSubtitle;

  bool _cameraEnabled = true;
  bool _cameraInitializationInProgress = false;
  bool _submissionStarted = false;
  bool _navigatingToResult = false;
  AppLifecycleState _lifecycleState = AppLifecycleState.resumed;
  String _recognizedWords = '';
  String _accumulatedWords = '';
  String _currentSegmentWords = '';
  String? _cameraError;
  String? _sessionError;

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
        if (state == PlayerState.completed || state == PlayerState.stopped) {
          if (!_sessionLoading && _sessionError == null) {
            _activity = AvatarActivity.idle;
          }
        }
      });
    });

    _positionSubscription = _audioPlayer.onPositionChanged.listen((position) {
      if (!mounted) return;
      if (_activity == AvatarActivity.loading && position > Duration.zero) {
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

    final baseUrl = await AppSettings.getBaseUrl();
    _chatService = ChatService(baseUrl: baseUrl);
    _profile = await AuthService.getProfile();

    await _initializeCamera();
    await _initializeSpeech();
    await _initializeTts();

    try {
      final scenarioData = await _chatService!.getScenario(widget.scenario.id);
      final openingMessage = _sanitizeScenarioOpening(
        scenarioData['initial_conversation_state']?['ai_opening_message'] ??
            scenarioData['conversation_flow']?[0]?['message'] ??
            'Hello. Shall we begin?',
      );

      if (!mounted) return;
      setState(() {
        _messages
          ..clear()
          ..add(ConversationMessage(speaker: 'AI', message: openingMessage));
        _sessionLoading = false;
        _activity = AvatarActivity.idle;
      });
      await _speak(openingMessage);
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
      await _tts.setSpeechRate(0.45);
      await _tts.setPitch(1.0);
      await _tts.setVolume(1.0);
      await _tts.awaitSpeakCompletion(true);

      _tts.setStartHandler(() {
        if (!mounted) return;
        setState(() {
          _activity = AvatarActivity.speaking;
          if (_messages.isNotEmpty && _messages.last.speaker == 'AI') {
            _activeSubtitle = _messages.last;
          }
        });
      });

      _tts.setCompletionHandler(() {
        if (!mounted) return;
        setState(() {
          _activity = AvatarActivity.idle;
        });
      });
    } catch (_) {}
  }

  Future<void> _speak(String text) async {
    if (text.trim().isEmpty || !mounted) {
      if (mounted) setState(() => _activity = AvatarActivity.idle);
      return;
    }

    // Pastikan semua media terhenti sebelum memutar yang baru
    try {
      await _speech.stop();
      await _tts.stop();
      await _audioPlayer.stop();
    } catch (_) {}

    setState(() {
      _activity = AvatarActivity.speaking;
      if (_messages.isNotEmpty && _messages.last.speaker == 'AI') {
        _activeSubtitle = _messages.last;
      }
    });

    String gender = "female";
    final aiRoleLower = widget.scenario.aiRole.toLowerCase();
    if (aiRoleLower.contains("david") ||
        aiRoleLower.contains("male") ||
        aiRoleLower.contains("man") ||
        aiRoleLower.contains("mr.")) {
      gender = "male";
    }

    bool success = false;

    try {
      if (_chatService != null) {
        final baseUrl = _chatService!.baseUrl;
        final response = await http
            .post(
              Uri.parse('$baseUrl/api/tts'),
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode({
                'text': text,
                'gender': gender,
                'ai_role': widget.scenario.aiRole,
              }),
            )
            .timeout(const Duration(seconds: 8));

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          final audioUrl = data['audio_url'];

          if (audioUrl != null && mounted) {
            await _audioPlayer.play(UrlSource(audioUrl));
            success = true;
          }
        }
      }
    } catch (e) {
      debugPrint("Neural TTS failed, falling back to local TTS. Error: $e");
    }

    if (!success) {
      if (!mounted) return;
      setState(() {
        _activity = AvatarActivity.speaking;
        if (_messages.isNotEmpty && _messages.last.speaker == 'AI') {
          _activeSubtitle = _messages.last;
        }
      });
      try {
        await _tts.stop();
        await _tts.speak(text);
      } finally {
        if (mounted && !_sessionLoading && _sessionError == null) {
          setState(() => _activity = AvatarActivity.idle);
        }
      }
    }
  }

  Future<void> _toggleListening() async {
    if (_sessionLoading ||
        _sessionError != null ||
        _activity == AvatarActivity.thinking ||
        _activity == AvatarActivity.speaking) {
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

    if (_speech.isListening) {
      _pulsingController.stop();
      await _stopListeningAndSubmit();
      return;
    }

    _submissionStarted = false;
    _accumulatedWords = '';
    _currentSegmentWords = '';
    setState(() {
      _recognizedWords = '';
      _activity = AvatarActivity.listening;
    });

    _pulsingController.repeat(reverse: true);

    await _speech.listen(
      onResult: _onSpeechResult,
      listenOptions: SpeechListenOptions(
        localeId: 'en_US',
        listenMode: ListenMode.dictation,
        partialResults: true,
        cancelOnError: true,
        pauseFor: const Duration(seconds: 10),
        listenFor: const Duration(seconds: 60),
      ),
    );
  }

  void _onSpeechResult(SpeechRecognitionResult result) {
    if (!mounted) return;
    final current = result.recognizedWords.trim();
    if (current.isEmpty) return;

    final lowerCurrent = current.toLowerCase();
    final lowerPrevSegment = _currentSegmentWords.trim().toLowerCase();

    if (lowerPrevSegment.isNotEmpty &&
        !lowerCurrent.startsWith(lowerPrevSegment) &&
        !lowerCurrent.contains(lowerPrevSegment)) {
      if (_accumulatedWords.isNotEmpty) {
        _accumulatedWords = '$_accumulatedWords $_currentSegmentWords'.trim();
      } else {
        _accumulatedWords = _currentSegmentWords.trim();
      }
      _currentSegmentWords = current;
    } else {
      _currentSegmentWords = current;
    }

    final fullWords = _accumulatedWords.isEmpty
        ? _currentSegmentWords
        : '$_accumulatedWords $_currentSegmentWords'.trim();

    setState(() => _recognizedWords = fullWords);
  }

  void _onSpeechStatus(String status) {
    if (!mounted || _submissionStarted) return;
    if ((status == SpeechToText.doneStatus ||
            status == SpeechToText.notListeningStatus) &&
        _activity == AvatarActivity.listening) {
      _pulsingController.stop();
      final words = _recognizedWords.trim();
      if (words.isNotEmpty) {
        _submissionStarted = true;
        unawaited(_submitResponse(words));
      } else {
        setState(() => _activity = AvatarActivity.idle);
      }
    }
  }

  void _onSpeechError(SpeechRecognitionError error) {
    if (!mounted) return;
    _pulsingController.stop();
    setState(() => _activity = AvatarActivity.idle);
    if (error.permanent) {
      String userFriendlyMessage;
      if (error.errorMsg == 'error_speech_timeout' ||
          error.errorMsg == 'error_no_match') {
        userFriendlyMessage =
            'Tidak ada suara terdeteksi. Silakan tekan tombol mic dan coba bicara lagi.';
      } else {
        userFriendlyMessage = 'Microphone: ${error.errorMsg}';
      }

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(userFriendlyMessage)));
    }
  }

  Future<void> _stopListeningAndSubmit() async {
    _pulsingController.stop();
    await _speech.stop();
    if (_submissionStarted) return;
    final words = _recognizedWords.trim();
    if (words.isEmpty) {
      if (mounted) setState(() => _activity = AvatarActivity.idle);
      return;
    }
    _submissionStarted = true;
    await _submitResponse(words);
  }

  Future<void> _submitResponse(
    String text, {
    bool addStudentMessage = true,
  }) async {
    if (text.trim().isEmpty || _chatService == null || !mounted) return;
    _pulsingController.stop();
    await _speech.stop();
    await _tts.stop();

    setState(() {
      _recognizedWords = '';
      if (addStudentMessage) {
        final studentMsg = ConversationMessage(
          speaker: 'Student',
          message: text,
        );
        _messages.add(studentMsg);
        _activeSubtitle = studentMsg;
      }
      _activity = AvatarActivity.thinking;
    });

    try {
      final historyMessages =
          _messages.isNotEmpty &&
              _messages.last.speaker == 'Student' &&
              _messages.last.message == text
          ? _messages.take(_messages.length - 1)
          : _messages;
      final history = historyMessages
          .map(
            (message) => {
              'speaker': message.speaker,
              'message': message.message,
            },
          )
          .toList();
      final turnNumber = _studentResponseCount + 1;
      final result = await _chatService!.respondTurn(
        sessionId: _sessionId,
        scenarioId: widget.scenario.id,
        studentResponseCount: turnNumber,
        conversationHistory: history,
        studentResponse: text,
        studentDisplayName: _profile?.name,
        studentId: _profile?.studentId,
      );

      if (!mounted) return;
      setState(() {
        _lastResponse = result;
        _evaluationResults.add(result);
        _messages.add(
          ConversationMessage(speaker: 'AI', message: result.aiMessage),
        );
        _studentResponseCount++;
      });

      await _speak(result.aiMessage);
      unawaited(
        _refreshTurnEvaluation(
          turnNumber: turnNumber,
          history: history,
          studentResponse: text,
        ),
      );
      if (!result.continueConversation && mounted) {
        await _openResult();
      }
    } catch (error) {
      if (!mounted) return;
      setState(() => _activity = AvatarActivity.idle);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Response failed: $error'),
          action: SnackBarAction(
            label: 'Retry',
            onPressed: () {
              _submissionStarted = true;
              unawaited(_submitResponse(text, addStudentMessage: false));
            },
          ),
        ),
      );
    } finally {
      _submissionStarted = false;
    }
  }

  Future<void> _refreshTurnEvaluation({
    required int turnNumber,
    required List<Map<String, String>> history,
    required String studentResponse,
  }) async {
    if (_chatService == null) return;
    try {
      final detailedResult = await _chatService!.evaluateTurn(
        sessionId: _sessionId,
        scenarioId: widget.scenario.id,
        studentResponseCount: turnNumber,
        conversationHistory: history,
        studentResponse: studentResponse,
        studentDisplayName: _profile?.name,
        studentId: _profile?.studentId,
      );
      if (!mounted) return;
      setState(() {
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

  Future<void> _requestFinish() async {
    if (_lastResponse == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Give at least one response first.')),
      );
      return;
    }
    final shouldFinish = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Finish practice?'),
        content: const Text('Your result and conversation feedback are ready.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Continue'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Finish'),
          ),
        ],
      ),
    );
    if (shouldFinish == true && mounted) await _openResult();
  }

  Future<void> _openResult() async {
    if (_lastResponse == null || _navigatingToResult) return;
    _navigatingToResult = true;
    await _speech.stop();
    await _tts.stop();
    if (!mounted) return;
    final history = _messages
        .map(
          (message) => {'speaker': message.speaker, 'message': message.message},
        )
        .toList();
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
        ),
      ),
    );
  }

  Future<void> _confirmExit() async {
    // Unfocus keyboard first to prevent layout crash with O3D webview on pop
    FocusScope.of(context).unfocus();

    if (_evaluationResults.isEmpty) {
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

  String get _statusLabel {
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
    final maximum = progress['maximum_student_responses'] ?? 10;
    final completed =
        (progress['completed_objective_ids'] as List<dynamic>?)?.length ?? 0;
    final remaining =
        (progress['remaining_objective_ids'] as List<dynamic>?)?.length ?? 0;
    final objectiveProgress = completed + remaining > 0
        ? ' | Goals $completed/${completed + remaining}'
        : '';
    return '$activityLabel | Response $_studentResponseCount/$maximum$objectiveProgress';
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
    final aiRoleLower = widget.scenario.aiRole.toLowerCase();
    if (aiRoleLower.contains('david') ||
        aiRoleLower.contains('male') ||
        aiRoleLower.contains('man') ||
        aiRoleLower.contains('mr.')) {
      return 'assets/models/male_char.glb';
    }
    return 'assets/models/female_char.glb';
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
    required IconData icon,
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
        side: BorderSide(color: _black.withValues(alpha: 0.14), width: 1.2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      icon: Icon(icon),
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
        borderRadius: BorderRadius.circular(16),
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
        !_sessionLoading &&
        _sessionError == null &&
        _activity != AvatarActivity.thinking &&
        _activity != AvatarActivity.speaking &&
        _activity != AvatarActivity.loading;

    return PopScope(
      canPop: _evaluationResults.isEmpty,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) unawaited(_confirmExit());
      },
      child: Scaffold(
        backgroundColor: _cream,
        body: Stack(
          fit: StackFit.expand,
          children: [
            _buildCameraBackground(),
            if (_sessionError == null)
              Positioned(
                left: 0,
                right: 0,
                top: 75,
                bottom:
                    140, // Diperkecil agar tinggi area avatar lebih besar (melewati panel kontrol transparan)
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
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                child: Column(
                  children: [
                    Row(
                      children: [
                        _buildIconButton(
                          tooltip: 'Back',
                          icon: Icons.arrow_back_rounded,
                          onPressed: _confirmExit,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: _cream,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: _black.withValues(alpha: 0.12),
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: _black.withValues(alpha: 0.08),
                                  blurRadius: 16,
                                  offset: const Offset(0, 6),
                                ),
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  widget.scenario.id,
                                  style: TextStyle(
                                    color: _black.withValues(alpha: 0.55),
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12,
                                  ),
                                ),
                                Text(
                                  widget.scenario.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: _black,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        _buildIconButton(
                          tooltip: _showSubtitles
                              ? 'Hide subtitles'
                              : 'Show subtitles',
                          icon: _showSubtitles
                              ? Icons.closed_caption
                              : Icons.closed_caption_off_outlined,
                          onPressed: () =>
                              setState(() => _showSubtitles = !_showSubtitles),
                        ),
                        _buildIconButton(
                          tooltip: 'Transcript',
                          icon: Icons.receipt_long_outlined,
                          onPressed: _messages.isEmpty ? null : _showTranscript,
                        ),
                      ],
                    ),
                    const Spacer(),
                    _buildThinkingIndicator(),
                    if (_sessionError == null)
                      Align(
                        alignment: Alignment.center,
                        child: _buildSubtitle(),
                      ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
                      decoration: BoxDecoration(
                        color: _cream,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: _black.withValues(alpha: 0.12),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: _black.withValues(alpha: 0.14),
                            blurRadius: 24,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            _statusLabel,
                            style: const TextStyle(
                              color: _black,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              _buildIconButton(
                                tooltip: _cameraEnabled
                                    ? 'Turn camera off'
                                    : 'Turn camera on',
                                icon: _cameraEnabled
                                    ? Icons.videocam_outlined
                                    : Icons.videocam_off_outlined,
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
                                    return Stack(
                                      alignment: Alignment.center,
                                      children: [
                                        if (_speech.isListening)
                                          Container(
                                            width: 68 + (pulse * 24),
                                            height: 68 + (pulse * 24),
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                              color: const Color(0xFFD54343)
                                                  .withValues(
                                                    alpha: 0.45 * (1.0 - pulse),
                                                  ),
                                            ),
                                          ),
                                        child!,
                                      ],
                                    );
                                  },
                                  child: IconButton.filled(
                                    tooltip: _speech.isListening
                                        ? 'Stop listening'
                                        : 'Speak',
                                    onPressed: canInteract
                                        ? _toggleListening
                                        : null,
                                    style: IconButton.styleFrom(
                                      minimumSize: const Size(68, 68),
                                      backgroundColor: _speech.isListening
                                          ? _danger
                                          : _orange,
                                      foregroundColor: Colors.white,
                                      disabledBackgroundColor: _black
                                          .withValues(alpha: 0.12),
                                      disabledForegroundColor: _black
                                          .withValues(alpha: 0.35),
                                    ),
                                    iconSize: 31,
                                    icon: Icon(
                                      _speech.isListening
                                          ? Icons.stop_rounded
                                          : Icons.mic_rounded,
                                    ),
                                  ),
                                ),
                              ),
                              _buildIconButton(
                                tooltip: 'Finish practice',
                                icon: Icons.flag_outlined,
                                onPressed: _lastResponse == null
                                    ? null
                                    : _requestFinish,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
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
