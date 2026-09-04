import 'package:flutter/material.dart';

import '../models/ai_response.dart';
import '../models/practice_session.dart';
import '../models/scenario_topic.dart';
import '../theme/engora_theme.dart';
import '../widgets/app_svg_icon.dart';

enum PracticeReportMode { result, history }

class PracticeReportTurn {
  final String speaker;
  final String message;
  final bool isStudent;
  final int? studentTurn;
  final String feedback;

  const PracticeReportTurn({
    required this.speaker,
    required this.message,
    required this.isStudent,
    required this.studentTurn,
    required this.feedback,
  });
}

class PracticeReportData {
  static const scoreKeys = <String>[
    'grammar',
    'vocabulary',
    'fluency',
    'politeness',
    'pragmatic_appropriateness',
    'intercultural_awareness',
  ];

  final String title;
  final String aiName;
  final double overallScore;
  final String status;
  final int responseCount;
  final Map<String, double> scores;
  final String performanceSummary;
  final String doneWell;
  final String suggestions;
  final List<PracticeReportTurn> transcript;

  const PracticeReportData({
    required this.title,
    required this.aiName,
    required this.overallScore,
    required this.status,
    required this.responseCount,
    required this.scores,
    required this.performanceSummary,
    required this.doneWell,
    required this.suggestions,
    required this.transcript,
  });

  factory PracticeReportData.fromLive({
    required ScenarioTopic scenario,
    required AiResponse finalResponse,
    required List<AiResponse> evaluations,
    required List<Map<String, String>> conversation,
  }) {
    final results = evaluations.isEmpty ? [finalResponse] : evaluations;
    final scores = _averageScores(results);
    return PracticeReportData(
      title: scenario.title,
      aiName: _cleanAiName(scenario.aiRole),
      overallScore: _overall(scores),
      status: finalResponse.sessionProgress['session_complete'] == true
          ? 'Completed'
          : 'Ended manually',
      responseCount: results.length,
      scores: scores,
      performanceSummary: _performanceSummary(finalResponse),
      doneWell: _doneWell(scores, finalResponse),
      suggestions: _suggestions(finalResponse),
      transcript: _buildTranscript(
        conversation,
        results,
        _cleanAiName(scenario.aiRole),
      ),
    );
  }

  factory PracticeReportData.fromSession(PracticeSession session) {
    final results = session.evaluations;
    final finalResponse = results.isEmpty ? null : results.last;
    final scores = <String, double>{
      for (final key in scoreKeys) key: session.averageScores[key] ?? 0,
    };
    return PracticeReportData(
      title: (session.settingTitle?.trim().isNotEmpty ?? false)
          ? session.settingTitle!.trim()
          : session.scenario.title,
      aiName: _cleanAiName(session.scenario.aiRole),
      overallScore: session.overallScore,
      status: session.status == 'completed' ? 'Completed' : 'Ended manually',
      responseCount: session.studentResponseCount,
      scores: scores,
      performanceSummary: finalResponse == null
          ? 'This practice session was saved without a written performance summary.'
          : _performanceSummary(finalResponse),
      doneWell: _doneWell(scores, finalResponse),
      suggestions: finalResponse == null
          ? 'Review the transcript and continue practicing the same communication setting.'
          : _suggestions(finalResponse),
      transcript: _buildTranscript(
        session.transcript,
        results,
        _cleanAiName(session.scenario.aiRole),
      ),
    );
  }

  static Map<String, double> _averageScores(List<AiResponse> results) {
    return {
      for (final key in scoreKeys)
        key: results.isEmpty
            ? 0
            : results.fold<double>(
                    0,
                    (sum, result) =>
                        sum + ((result.scores[key] as num?)?.toDouble() ?? 0),
                  ) /
                  results.length,
    };
  }

  static double _overall(Map<String, double> scores) {
    if (scores.isEmpty) return 0;
    return scores.values.reduce((left, right) => left + right) / scores.length;
  }

  static String _performanceSummary(AiResponse response) {
    final feedback = response.feedback.trim();
    if (feedback.isNotEmpty) return feedback;
    final note = response.culturalNote.trim();
    if (note.isNotEmpty) return note;
    return 'Your speaking practice was completed and recorded successfully.';
  }

  static String _doneWell(Map<String, double> scores, AiResponse? response) {
    final completed = response?.completedObjectiveIds ?? const <String>[];
    if (completed.isNotEmpty) {
      return 'You completed ${completed.length} communication objectives during this practice.';
    }
    final ranked = scores.entries.toList()
      ..sort((left, right) => right.value.compareTo(left.value));
    final strongest = ranked
        .where((entry) => entry.value > 0)
        .take(2)
        .map((entry) => _scoreLabel(entry.key).toLowerCase())
        .toList();
    if (strongest.isEmpty) {
      return 'You completed the conversation and kept the interaction moving.';
    }
    return 'Your strongest areas were ${strongest.join(' and ')}.';
  }

  static String _suggestions(AiResponse response) {
    final parts = <String>[];
    if (response.improvedResponse.trim().isNotEmpty) {
      parts.add('Try saying: "${response.improvedResponse.trim()}"');
    }
    if (response.culturalNote.trim().isNotEmpty) {
      parts.add(response.culturalNote.trim());
    }
    if (parts.isNotEmpty) return parts.join('\n\n');
    return 'Keep practicing this setting and focus on clear, polite, and culturally appropriate responses.';
  }

  static List<PracticeReportTurn> _buildTranscript(
    List<Map<String, String>> conversation,
    List<AiResponse> evaluations,
    String aiName,
  ) {
    var studentTurn = 0;
    return conversation.map((item) {
      final rawSpeaker = (item['speaker'] ?? '').trim();
      final normalized = rawSpeaker.toLowerCase();
      final isStudent =
          normalized == 'student' ||
          normalized == 'you' ||
          normalized == 'user' ||
          normalized.contains('mahasiswa');
      AiResponse? evaluation;
      if (isStudent) {
        studentTurn += 1;
        if (studentTurn <= evaluations.length) {
          evaluation = evaluations[studentTurn - 1];
        }
      }
      final feedback = evaluation == null
          ? ''
          : [
              if (evaluation.feedback.trim().isNotEmpty)
                evaluation.feedback.trim(),
              if (evaluation.improvedResponse.trim().isNotEmpty)
                'Try: ${evaluation.improvedResponse.trim()}',
            ].join('\n');
      return PracticeReportTurn(
        speaker: isStudent
            ? 'You'
            : (rawSpeaker.isEmpty || normalized == 'ai' ? aiName : rawSpeaker),
        message: item['message'] ?? '',
        isStudent: isStudent,
        studentTurn: isStudent ? studentTurn : null,
        feedback: feedback,
      );
    }).toList();
  }

  static String _cleanAiName(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return 'AI Partner';
    final parenthesis = trimmed.indexOf('(');
    final comma = trimmed.indexOf(',');
    final end = [if (parenthesis > 0) parenthesis, if (comma > 0) comma];
    if (end.isEmpty) return trimmed;
    end.sort();
    return trimmed.substring(0, end.first).trim();
  }

  static String _scoreLabel(String key) => switch (key) {
    'grammar' => 'Grammar',
    'vocabulary' => 'Vocabulary',
    'fluency' => 'Fluency',
    'politeness' => 'Politeness',
    'pragmatic_appropriateness' => 'Pragmatic Appropriateness',
    'intercultural_awareness' => 'Intercultural Awareness',
    _ => key,
  };
}

class PracticeReportScreen extends StatelessWidget {
  final PracticeReportData data;
  final PracticeReportMode mode;

  const PracticeReportScreen({
    super.key,
    required this.data,
    required this.mode,
  });

  bool get _isResult => mode == PracticeReportMode.result;

  void _handleBack(BuildContext context) {
    if (_isResult) {
      Navigator.popUntil(context, (route) => route.isFirst);
    } else {
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EngoraColors.background,
      body: SafeArea(
        child: Column(
          children: [
            _ReportHeader(
              title: _isResult ? 'Practice Result' : 'Practice Details',
              onBack: () => _handleBack(context),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 26),
                children: [
                  Text(
                    data.title,
                    style: EngoraTheme.display(fontSize: 30, height: 1.35),
                  ),
                  const SizedBox(height: 24),
                  _OverallSummary(data: data),
                  const SizedBox(height: 14),
                  _ScoreGrid(scores: data.scores),
                  const SizedBox(height: 14),
                  _TextSection(
                    title: 'Performance Summary',
                    body: data.performanceSummary,
                  ),
                  _TextSection(title: 'What You Did Well', body: data.doneWell),
                  _TextSection(
                    title: 'Suggestions for Improvement',
                    body: data.suggestions,
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Conversation Transcript',
                    style: TextStyle(
                      color: EngoraColors.muted,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 10),
                  if (data.transcript.isEmpty)
                    const Text(
                      'No transcript was recorded for this practice.',
                      style: TextStyle(color: EngoraColors.muted),
                    )
                  else
                    for (final turn in data.transcript)
                      _TranscriptBubble(turn: turn),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _isResult
          ? SafeArea(
              top: false,
              child: Container(
                color: EngoraColors.background,
                padding: const EdgeInsets.fromLTRB(24, 10, 24, 18),
                child: FilledButton(
                  onPressed: () => _handleBack(context),
                  child: const Text('Back to Home'),
                ),
              ),
            )
          : null,
    );
  }
}

class _ReportHeader extends StatelessWidget {
  final String title;
  final VoidCallback onBack;

  const _ReportHeader({required this.title, required this.onBack});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 18, 24, 8),
      child: SizedBox(
        height: 52,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
            ),
            Align(
              alignment: Alignment.centerLeft,
              child: IconButton(
                tooltip: 'Back',
                onPressed: onBack,
                icon: const AppSvgIcon(AppIcons.back, size: 26),
                style: IconButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: EngoraColors.ink,
                  minimumSize: const Size(48, 48),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OverallSummary extends StatelessWidget {
  final PracticeReportData data;

  const _OverallSummary({required this.data});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Overall Score',
                style: TextStyle(color: EngoraColors.muted, fontSize: 12),
              ),
              const SizedBox(height: 5),
              Text(
                '${data.overallScore.clamp(0, 5).toStringAsFixed(1)} / 5',
                style: EngoraTheme.display(
                  fontSize: 30,
                  color: EngoraColors.brand,
                  height: 1,
                ),
              ),
            ],
          ),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            const Text(
              'Status',
              style: TextStyle(color: EngoraColors.muted, fontSize: 12),
            ),
            const SizedBox(height: 5),
            Text(
              data.status,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            Text(
              '${data.responseCount} speaking turns',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ],
    );
  }
}

class _ScoreGrid extends StatelessWidget {
  final Map<String, double> scores;

  const _ScoreGrid({required this.scores});

  @override
  Widget build(BuildContext context) {
    final items = PracticeReportData.scoreKeys
        .map(
          (key) => _ScoreCard(
            label: PracticeReportData._scoreLabel(key),
            score: scores[key] ?? 0,
          ),
        )
        .toList();
    return Column(
      children: [
        Row(
          children: [
            for (var index = 0; index < 4; index++) ...[
              Expanded(child: items[index]),
              if (index < 3) const SizedBox(width: 8),
            ],
          ],
        ),
        const SizedBox(height: 9),
        Row(
          children: [
            Expanded(child: items[4]),
            const SizedBox(width: 9),
            Expanded(child: items[5]),
          ],
        ),
      ],
    );
  }
}

class _ScoreCard extends StatelessWidget {
  final String label;
  final double score;

  const _ScoreCard({required this.label, required this.score});

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 66),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: EngoraColors.line),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: EngoraColors.muted,
              fontSize: 10.5,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            '${score.clamp(0, 5).toStringAsFixed(1)} / 5',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class _TextSection extends StatelessWidget {
  final String title;
  final String body;

  const _TextSection({required this.title, required this.body});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(color: EngoraColors.muted, fontSize: 12),
          ),
          const SizedBox(height: 6),
          Text(
            body.trim().isEmpty ? '-' : body,
            style: const TextStyle(fontSize: 13.5, height: 1.3),
          ),
        ],
      ),
    );
  }
}

class _TranscriptBubble extends StatelessWidget {
  final PracticeReportTurn turn;

  const _TranscriptBubble({required this.turn});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: turn.isStudent ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.72,
        ),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.fromLTRB(14, 13, 14, 13),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: turn.isStudent ? EngoraColors.brand : EngoraColors.line,
          ),
        ),
        child: Column(
          crossAxisAlignment: turn.isStudent
              ? CrossAxisAlignment.end
              : CrossAxisAlignment.start,
          children: [
            Text(
              turn.isStudent ? 'You (Turn ${turn.studentTurn})' : turn.speaker,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
            const SizedBox(height: 7),
            Text(
              turn.message,
              textAlign: turn.isStudent ? TextAlign.right : TextAlign.left,
              style: const TextStyle(
                color: EngoraColors.muted,
                fontSize: 12.5,
                height: 1.3,
              ),
            ),
            if (turn.feedback.isNotEmpty) ...[
              const SizedBox(height: 10),
              const Divider(height: 1, color: EngoraColors.line),
              const SizedBox(height: 9),
              const Text(
                'Feedback',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 3),
              Text(
                turn.feedback,
                textAlign: TextAlign.right,
                style: const TextStyle(
                  color: EngoraColors.muted,
                  fontSize: 12,
                  height: 1.3,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
