class AiResponse {
  final String sessionId;
  final String scenarioId;
  final int turnNumber;
  final String aiMessage;
  final String detectedCategory;
  final Map<String, dynamic> scores;
  final String feedback;
  final String culturalNote;
  final String improvedResponse;
  final bool continueConversation;
  final List<String> completedObjectiveIds;
  final Map<String, dynamic> sessionProgress;
  final String? endReason;
  final String source;

  AiResponse({
    required this.sessionId,
    required this.scenarioId,
    required this.turnNumber,
    required this.aiMessage,
    required this.detectedCategory,
    required this.scores,
    required this.feedback,
    required this.culturalNote,
    required this.improvedResponse,
    required this.continueConversation,
    required this.completedObjectiveIds,
    required this.sessionProgress,
    required this.endReason,
    required this.source,
  });

  factory AiResponse.fromJson(Map<String, dynamic> json) {
    return AiResponse(
      sessionId: json["session_id"] ?? "",
      scenarioId: json["scenario_id"] ?? "",
      turnNumber: json["turn_number"] ?? 0,
      aiMessage: json["ai_message"] ?? "",
      detectedCategory: json["detected_category"] ?? "",
      scores: json["scores"] ?? {},
      feedback: json["feedback"] ?? "",
      culturalNote: json["cultural_note"] ?? "",
      improvedResponse: json["improved_response"] ?? "",
      continueConversation: json["continue_conversation"] ?? false,
      completedObjectiveIds:
          (json["completed_objective_ids"] as List<dynamic>? ?? const [])
              .map((item) => item.toString())
              .toList(),
      sessionProgress: Map<String, dynamic>.from(
        json["session_progress"] as Map? ?? const {},
      ),
      endReason: json["end_reason"],
      source: json["source"] ?? "unknown",
    );
  }

  Map<String, dynamic> toJson() => {
    'session_id': sessionId,
    'scenario_id': scenarioId,
    'turn_number': turnNumber,
    'ai_message': aiMessage,
    'detected_category': detectedCategory,
    'scores': scores,
    'feedback': feedback,
    'cultural_note': culturalNote,
    'improved_response': improvedResponse,
    'continue_conversation': continueConversation,
    'completed_objective_ids': completedObjectiveIds,
    'session_progress': sessionProgress,
    'end_reason': endReason,
    'source': source,
  };
}
