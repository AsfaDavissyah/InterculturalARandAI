class GuidedTopic {
  final String topicId;
  final String title;
  final String description;
  final String iconKey;
  final int displayOrder;
  final bool isActive;
  final List<String> languageObjectives;
  final List<String> iccObjectives;

  GuidedTopic({
    required this.topicId,
    required this.title,
    required this.description,
    required this.iconKey,
    required this.displayOrder,
    required this.isActive,
    required this.languageObjectives,
    required this.iccObjectives,
  });

  factory GuidedTopic.fromJson(Map<String, dynamic> json) {
    final rawLangObj = json['languageObjectives'] ?? json['language_objectives'];
    final rawIccObj = json['iccObjectives'] ?? json['icc_objectives'];

    return GuidedTopic(
      topicId: json['topicId'] ?? json['topic_id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      iconKey: json['iconKey'] ?? json['icon_key'] ?? 'school',
      displayOrder: (json['displayOrder'] ?? json['display_order'] ?? 0) as int,
      isActive: (json['isActive'] ?? json['is_active'] ?? true) as bool,
      languageObjectives: rawLangObj is List
          ? rawLangObj.map((e) => e.toString()).toList()
          : [],
      iccObjectives: rawIccObj is List
          ? rawIccObj.map((e) => e.toString()).toList()
          : [],
    );
  }
}
