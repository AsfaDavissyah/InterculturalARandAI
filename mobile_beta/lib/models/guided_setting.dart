class GuidedAiCharacter {
  final String displayName;
  final String role;
  final String culture;
  final String avatarKey;

  GuidedAiCharacter({
    required this.displayName,
    required this.role,
    required this.culture,
    required this.avatarKey,
  });

  factory GuidedAiCharacter.fromJson(Map<String, dynamic> json) {
    return GuidedAiCharacter(
      displayName: json['display_name'] ?? json['displayName'] ?? 'AI Partner',
      role: json['role'] ?? 'Conversation partner',
      culture: json['culture'] ?? 'International',
      avatarKey: json['avatar_key'] ?? json['avatarKey'] ?? 'default_avatar',
    );
  }

  Map<String, dynamic> toJson() => {
    'display_name': displayName,
    'role': role,
    'culture': culture,
    'avatar_key': avatarKey,
  };
}

class GuidedSessionRules {
  final int minimumStudentResponses;
  final int targetStudentResponsesMin;
  final int targetStudentResponsesMax;
  final int maximumStudentResponses;

  GuidedSessionRules({
    required this.minimumStudentResponses,
    required this.targetStudentResponsesMin,
    required this.targetStudentResponsesMax,
    required this.maximumStudentResponses,
  });

  factory GuidedSessionRules.fromJson(Map<String, dynamic> json) {
    return GuidedSessionRules(
      minimumStudentResponses:
          (json['minimumStudentResponses'] ??
                  json['minimum_student_responses'] ??
                  5)
              as int,
      targetStudentResponsesMin:
          (json['targetStudentResponsesMin'] ??
                  json['target_student_responses_min'] ??
                  6)
              as int,
      targetStudentResponsesMax:
          (json['targetStudentResponsesMax'] ??
                  json['target_student_responses_max'] ??
                  8)
              as int,
      maximumStudentResponses:
          (json['maximumStudentResponses'] ??
                  json['maximum_student_responses'] ??
                  10)
              as int,
    );
  }

  Map<String, dynamic> toJson() => {
    'minimum_student_responses': minimumStudentResponses,
    'target_student_responses_min': targetStudentResponsesMin,
    'target_student_responses_max': targetStudentResponsesMax,
    'maximum_student_responses': maximumStudentResponses,
  };
}

class GuidedSetting {
  final String settingId;
  final String topicId;
  final String title;
  final String location;
  final String briefing;
  final String stickerAssetKey;
  final String studentRole;
  final GuidedAiCharacter aiCharacter;
  final String taskInstruction;
  final GuidedSessionRules sessionRules;
  final int displayOrder;
  final bool isActive;

  GuidedSetting({
    required this.settingId,
    required this.topicId,
    required this.title,
    required this.location,
    required this.briefing,
    required this.stickerAssetKey,
    required this.studentRole,
    required this.aiCharacter,
    required this.taskInstruction,
    required this.sessionRules,
    required this.displayOrder,
    required this.isActive,
  });

  factory GuidedSetting.fromJson(Map<String, dynamic> json) {
    return GuidedSetting(
      settingId: json['settingId'] ?? json['setting_id'] ?? '',
      topicId: json['topicId'] ?? json['topic_id'] ?? '',
      title: json['title'] ?? '',
      location: json['location'] ?? '',
      briefing: json['briefing'] ?? '',
      stickerAssetKey:
          json['stickerAssetKey'] ?? json['sticker_asset_key'] ?? '',
      studentRole: json['studentRole'] ?? json['student_role'] ?? '',
      aiCharacter: GuidedAiCharacter.fromJson(
        Map<String, dynamic>.from(
          json['aiCharacter'] ?? json['ai_character'] ?? {},
        ),
      ),
      taskInstruction:
          json['taskInstruction'] ?? json['task_instruction'] ?? '',
      sessionRules: GuidedSessionRules.fromJson(
        Map<String, dynamic>.from(
          json['sessionRules'] ?? json['session_rules'] ?? {},
        ),
      ),
      displayOrder: (json['displayOrder'] ?? json['display_order'] ?? 0) as int,
      isActive: (json['isActive'] ?? json['is_active'] ?? true) as bool,
    );
  }

  String buildOpeningMessage() {
    final name = aiCharacter.displayName.trim();
    if (name.isEmpty || name == 'AI Partner') {
      return 'Hello. It is nice to meet you. Whenever you are ready, please begin.';
    }
    return "Hello. I'm $name. It's nice to meet you. Whenever you're ready, please begin.";
  }
}
