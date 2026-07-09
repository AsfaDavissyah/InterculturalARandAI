import 'package:flutter/material.dart';
import '../services/chat_service.dart';
import '../services/app_settings.dart';
import '../models/ai_response.dart';
import '../models/practice_session.dart';
import '../models/scenario_topic.dart';
import 'result_screen.dart';

class ChatScreen extends StatefulWidget {
  final ScenarioTopic scenario;

  const ChatScreen({super.key, required this.scenario});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class ChatMessage {
  final String speaker;
  final String message;

  ChatMessage({required this.speaker, required this.message});
}

class _ChatScreenState extends State<ChatScreen> {
  late final String _sessionId = PracticeSession.createSessionId();
  final TextEditingController _controller = TextEditingController();
  final ChatService _chatService = const ChatService(
    baseUrl: AppSettings.defaultBaseUrl,
  );

  final List<ChatMessage> _messages = [];
  final List<AiResponse> _evaluationResults = [];

  int _studentResponseCount = 0;
  bool _isLoading = false;
  bool _isScenarioLoading = true;
  AiResponse? _lastResponse;

  @override
  void initState() {
    super.initState();
    _loadScenarioOpening();
  }

  Future<void> _loadScenarioOpening() async {
    try {
      final scenarioData = await _chatService.getScenario(widget.scenario.id);

      final openingMessage =
          scenarioData["initial_conversation_state"]?["ai_opening_message"] ??
          scenarioData["conversation_flow"]?[0]?["message"] ??
          "Excuse me, are you the student volunteer from the university who is going to pick me up at the airport?";

      if (!mounted) return;

      setState(() {
        _messages.add(ChatMessage(speaker: "AI", message: openingMessage));
        _isScenarioLoading = false;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _messages.add(
          ChatMessage(
            speaker: "System",
            message: "Failed to load scenario opening: $e",
          ),
        );
        _isScenarioLoading = false;
      });
    }
  }

  Future<void> _sendMessage() async {
    final text = _controller.text.trim();

    if (text.isEmpty || _isLoading || _isScenarioLoading) return;

    setState(() {
      _messages.add(ChatMessage(speaker: "Student", message: text));
      _controller.clear();
      _isLoading = true;
    });

    try {
      final history = _messages
          .map((msg) => {"speaker": msg.speaker, "message": msg.message})
          .toList();

      final result = await _chatService.evaluateTurn(
        sessionId: _sessionId,
        scenarioId: widget.scenario.id,
        studentResponseCount: _studentResponseCount + 1,
        conversationHistory: history,
        studentResponse: text,
      );

      if (!mounted) return;

      setState(() {
        _lastResponse = result;
        _evaluationResults.add(result);
        _messages.add(ChatMessage(speaker: "AI", message: result.aiMessage));
        _studentResponseCount++;
      });

      if (!result.continueConversation && mounted) {
        final finalHistory = _messages
            .map((msg) => {"speaker": msg.speaker, "message": msg.message})
            .toList();

        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ResultScreen(
              scenario: widget.scenario,
              finalResponse: result,
              evaluationResults: _evaluationResults,
              conversationHistory: finalHistory,
            ),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _messages.add(ChatMessage(speaker: "System", message: "Error: $e"));
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Widget _buildMessageBubble(ChatMessage msg) {
    final isStudent = msg.speaker == "Student";
    final isSystem = msg.speaker == "System";

    return Align(
      alignment: isStudent ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.all(12),
        constraints: const BoxConstraints(maxWidth: 300),
        decoration: BoxDecoration(
          color: isSystem
              ? Colors.orange.shade100
              : isStudent
              ? Colors.green.shade100
              : Colors.blue.shade100,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: isStudent
              ? CrossAxisAlignment.end
              : CrossAxisAlignment.start,
          children: [
            Text(
              msg.speaker,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(msg.message),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isFinished = _lastResponse?.continueConversation == false;
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: Text(widget.scenario.id)),
      body: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              color: colorScheme.primaryContainer.withValues(alpha: 0.45),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.scenario.title,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text("Task: ${widget.scenario.taskInstruction}"),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _PracticeChip(
                        icon: Icons.view_in_ar_outlined,
                        label: widget.scenario.arScene,
                      ),
                      _PracticeChip(
                        icon: Icons.record_voice_over_outlined,
                        label: "AI role: ${widget.scenario.aiRole}",
                      ),
                      _PracticeChip(
                        icon: Icons.school_outlined,
                        label: widget.scenario.level,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Expanded(
              child: _isScenarioLoading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView(
                      padding: const EdgeInsets.all(12),
                      children: [..._messages.map(_buildMessageBubble)],
                    ),
            ),
            if (_isLoading)
              const Padding(
                padding: EdgeInsets.all(8),
                child: CircularProgressIndicator(),
              ),
            if (!isFinished)
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        minLines: 1,
                        maxLines: 3,
                        enabled: !_isScenarioLoading && !_isLoading,
                        decoration: const InputDecoration(
                          hintText: "Type your speaking response...",
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: (_isLoading || _isScenarioLoading)
                          ? null
                          : _sendMessage,
                      child: const Text("Send"),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}

class _PracticeChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _PracticeChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16),
          const SizedBox(width: 6),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 260),
            child: Text(label, overflow: TextOverflow.ellipsis),
          ),
        ],
      ),
    );
  }
}
