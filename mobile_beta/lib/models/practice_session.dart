import 'dart:math';

import 'ai_response.dart';
import 'scenario_topic.dart';

class PracticeSession {
  static const schemaVersion = 1;
  static const scoreKeys = [
    'grammar',
    'vocabulary',
    'fluency',
    'politeness',
    'pragmatic_appropriateness',
    'intercultural_awareness',
  ];

  final String sessionId;
  final String studentId;
  final String? studentName;
  final ScenarioTopic scenario;
  final DateTime startedAt;
  final DateTime completedAt;
  final int durationSeconds;
  final String status;
  final String? endReason;
  final int studentResponseCount;
  final List<Map<String, String>> transcript;
  final List<AiResponse> evaluations;
  final Map<String, double> averageScores;
  final double overallScore;
  final List<String> completedObjectiveIds;
  final String experienceType;
  final String? topicId;
  final String? topicTitle;
  final String? settingId;
  final String? settingTitle;
  final String? avatarKey;
  final String launchSource;

  const PracticeSession({
    required this.sessionId,
    required this.studentId,
    required this.studentName,
    required this.scenario,
    required this.startedAt,
    required this.completedAt,
    required this.durationSeconds,
    required this.status,
    required this.endReason,
    required this.studentResponseCount,
    required this.transcript,
    required this.evaluations,
    required this.averageScores,
    required this.overallScore,
    required this.completedObjectiveIds,
    this.experienceType = 'legacy_scenario',
    this.topicId,
    this.topicTitle,
    this.settingId,
    this.settingTitle,
    this.avatarKey,
    this.launchSource = 'legacy',
  });

  static String createSessionId({DateTime? now, Random? random}) {
    final timestamp = (now ?? DateTime.now().toUtc()).microsecondsSinceEpoch;
    final suffix = (random ?? Random.secure()).nextInt(0xFFFFFF);
    return 'session_${timestamp}_${suffix.toRadixString(16).padLeft(6, '0')}';
  }

  factory PracticeSession.fromPractice({
    required String sessionId,
    required ScenarioTopic scenario,
    required DateTime startedAt,
    required DateTime completedAt,
    required List<Map<String, String>> transcript,
    required List<AiResponse> evaluations,
    String studentId = 'local_student',
    String? studentName,
    String experienceType = 'legacy_scenario',
    String? topicId,
    String? topicTitle,
    String? settingId,
    String? settingTitle,
    String? avatarKey,
    String launchSource = 'legacy',
  }) {
    final averages = <String, double>{};
    for (final key in scoreKeys) {
      final total = evaluations.fold<double>(
        0,
        (sum, result) => sum + ((result.scores[key] as num?)?.toDouble() ?? 0),
      );
      averages[key] = evaluations.isEmpty ? 0 : total / evaluations.length;
    }
    final overall = averages.isEmpty
        ? 0.0
        : averages.values.reduce((left, right) => left + right) /
              averages.length;
    final finalResponse = evaluations.isEmpty ? null : evaluations.last;
    final naturallyCompleted =
        finalResponse?.sessionProgress['session_complete'] == true;

    return PracticeSession(
      sessionId: sessionId,
      studentId: studentId,
      studentName: studentName,
      scenario: scenario,
      startedAt: startedAt.toUtc(),
      completedAt: completedAt.toUtc(),
      durationSeconds: max(0, completedAt.difference(startedAt).inSeconds),
      status: naturallyCompleted ? 'completed' : 'ended_manually',
      endReason: finalResponse?.endReason ?? 'manual_finish',
      studentResponseCount: evaluations.length,
      transcript: transcript,
      evaluations: evaluations,
      averageScores: averages,
      overallScore: overall,
      completedObjectiveIds: finalResponse?.completedObjectiveIds ?? const [],
      experienceType: experienceType,
      topicId: topicId,
      topicTitle: topicTitle,
      settingId: settingId,
      settingTitle: settingTitle,
      avatarKey: avatarKey,
      launchSource: launchSource,
    );
  }

  factory PracticeSession.fromJson(Map<String, dynamic> json) {
    return PracticeSession(
      sessionId: json['session_id'] as String? ?? '',
      studentId: json['student']?['student_id'] as String? ?? 'local_student',
      studentName: json['student']?['display_name'] as String?,
      scenario: ScenarioTopic.fromJson(
        Map<String, dynamic>.from(json['scenario'] as Map? ?? const {}),
      ),
      startedAt: DateTime.parse(json['started_at'] as String).toUtc(),
      completedAt: DateTime.parse(json['completed_at'] as String).toUtc(),
      durationSeconds: (json['duration_seconds'] as num?)?.toInt() ?? 0,
      status: json['status'] as String? ?? 'completed',
      endReason: json['end_reason'] as String?,
      studentResponseCount:
          (json['student_response_count'] as num?)?.toInt() ?? 0,
      transcript: (json['transcript'] as List<dynamic>? ?? const [])
          .map((item) => Map<String, String>.from(item as Map))
          .toList(),
      evaluations: (json['evaluations'] as List<dynamic>? ?? const [])
          .map(
            (item) =>
                AiResponse.fromJson(Map<String, dynamic>.from(item as Map)),
          )
          .toList(),
      averageScores: Map<String, dynamic>.from(
        json['average_scores'] as Map? ?? const {},
      ).map((key, value) => MapEntry(key, (value as num).toDouble())),
      overallScore: (json['overall_score'] as num?)?.toDouble() ?? 0,
      completedObjectiveIds:
          (json['completed_objective_ids'] as List<dynamic>? ?? const [])
              .map((item) => item.toString())
              .toList(),
      experienceType: json['experience_type'] as String? ?? 'legacy_scenario',
      topicId: json['topic_id'] as String?,
      topicTitle: json['topic_title'] as String?,
      settingId: json['setting_id'] as String?,
      settingTitle: json['setting_title'] as String?,
      avatarKey: json['avatar_key'] as String?,
      launchSource: json['launch_source'] as String? ?? 'legacy',
    );
  }

  Map<String, dynamic> toJson() => {
    'schema_version': schemaVersion,
    'session_id': sessionId,
    'student': {'student_id': studentId, 'display_name': studentName},
    'scenario': scenario.toJson(),
    'started_at': startedAt.toUtc().toIso8601String(),
    'completed_at': completedAt.toUtc().toIso8601String(),
    'duration_seconds': durationSeconds,
    'status': status,
    'end_reason': endReason,
    'student_response_count': studentResponseCount,
    'transcript': transcript,
    'evaluations': evaluations.map((item) => item.toJson()).toList(),
    'average_scores': averageScores,
    'overall_score': overallScore,
    'completed_objective_ids': completedObjectiveIds,
    'experience_type': experienceType,
    if (topicId != null) 'topic_id': topicId,
    if (topicTitle != null) 'topic_title': topicTitle,
    if (settingId != null) 'setting_id': settingId,
    if (settingTitle != null) 'setting_title': settingTitle,
    if (avatarKey != null) 'avatar_key': avatarKey,
    'launch_source': launchSource,
  };

  Map<String, dynamic> toDashboardRecord() => {
    'schema_version': schemaVersion,
    'session_id': sessionId,
    'student_id': studentId,
    'student_name': studentName,
    'scenario_id': scenario.id,
    'scenario_version': scenario.scenarioVersion,
    'scenario_title': scenario.title,
    'scenario_type': scenario.type,
    'level': scenario.level,
    'practiced_at': completedAt.toUtc().toIso8601String(),
    'duration_seconds': durationSeconds,
    'status': status,
    'student_response_count': studentResponseCount,
    'overall_score': overallScore,
    'average_scores': averageScores,
    'completed_objective_ids': completedObjectiveIds,
    'transcript': transcript,
    'experience_type': experienceType,
    if (topicId != null) 'topic_id': topicId,
    if (topicTitle != null) 'topic_title': topicTitle,
    if (settingId != null) 'setting_id': settingId,
    if (settingTitle != null) 'setting_title': settingTitle,
    if (avatarKey != null) 'avatar_key': avatarKey,
    'launch_source': launchSource,
  };
}
