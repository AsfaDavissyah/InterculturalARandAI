class AiResponse {
  final String scenarioId;
  final int turnNumber;
  final String aiMessage;
  final String detectedCategory;
  final Map<String, dynamic> scores;
  final String feedback;
  final String culturalNote;
  final String improvedResponse;
  final bool continueConversation;
  final String? endReason;
  final String source;

  AiResponse({
    required this.scenarioId,
    required this.turnNumber,
    required this.aiMessage,
    required this.detectedCategory,
    required this.scores,
    required this.feedback,
    required this.culturalNote,
    required this.improvedResponse,
    required this.continueConversation,
    required this.endReason,
    required this.source,
  });

  factory AiResponse.fromJson(Map<String, dynamic> json) {
    return AiResponse(
      scenarioId: json["scenario_id"] ?? "",
      turnNumber: json["turn_number"] ?? 0,
      aiMessage: json["ai_message"] ?? "",
      detectedCategory: json["detected_category"] ?? "",
      scores: json["scores"] ?? {},
      feedback: json["feedback"] ?? "",
      culturalNote: json["cultural_note"] ?? "",
      improvedResponse: json["improved_response"] ?? "",
      continueConversation: json["continue_conversation"] ?? false,
      endReason: json["end_reason"],
      source: json["source"] ?? "unknown",
    );
  }
}