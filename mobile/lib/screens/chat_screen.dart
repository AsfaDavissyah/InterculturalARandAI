import 'package:flutter/material.dart';
import '../services/chat_service.dart';
import '../models/ai_response.dart';
import 'result_screen.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class ChatMessage {
  final String speaker;
  final String message;

  ChatMessage({
    required this.speaker,
    required this.message,
  });
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ChatService _chatService = ChatService();

  final List<ChatMessage> _messages = [];
  final List<AiResponse> _evaluationResults = [];

  int _turnNumber = 2;
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
      final scenario = await _chatService.getScenario();

      final openingMessage =
          scenario["initial_conversation_state"]?["ai_opening_message"] ??
              scenario["conversation_flow"]?[0]?["message"] ??
              "Excuse me, are you the student volunteer from the university who is going pick me up? I received a message from the international office saying someone would be here to meet me.";

      if (!mounted) return;

      setState(() {
        _messages.add(
          ChatMessage(
            speaker: "AI",
            message: openingMessage,
          ),
        );
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
      _messages.add(
        ChatMessage(
          speaker: "Student",
          message: text,
        ),
      );
      _controller.clear();
      _isLoading = true;
    });

    try {
      final history = _messages
          .map(
            (msg) => {
              "speaker": msg.speaker,
              "message": msg.message,
            },
          )
          .toList();

      final result = await _chatService.evaluateTurn(
        turnNumber: _turnNumber,
        conversationHistory: history,
        studentResponse: text,
      );

      if (!mounted) return;

      setState(() {
        _lastResponse = result;
        _evaluationResults.add(result);
        _messages.add(
          ChatMessage(
            speaker: "AI",
            message: result.aiMessage,
          ),
        );
        _turnNumber++;
      });

      if (!result.continueConversation && mounted) {
        final finalHistory = _messages
            .map(
              (msg) => {
                "speaker": msg.speaker,
                "message": msg.message,
              },
            )
            .toList();

        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ResultScreen(
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
        _messages.add(
          ChatMessage(
            speaker: "System",
            message: "Error: $e",
          ),
        );
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
          crossAxisAlignment:
              isStudent ? CrossAxisAlignment.end : CrossAxisAlignment.start,
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

    return Scaffold(
      appBar: AppBar(
        title: const Text("G-ICC-008 Chatbot"),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              color: Colors.blue.shade50,
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Welcoming an International Visitor",
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 4),
                  Text(
                    "Task: Welcome an international visitor and offer help politely.",
                  ),
                ],
              ),
            ),
            Expanded(
              child: _isScenarioLoading
                  ? const Center(
                      child: CircularProgressIndicator(),
                    )
                  : ListView(
                      padding: const EdgeInsets.all(12),
                      children: [
                        ..._messages.map(_buildMessageBubble),
                      ],
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
                          hintText: "Type your response...",
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed:
                          (_isLoading || _isScenarioLoading) ? null : _sendMessage,
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