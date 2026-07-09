import 'package:flutter/material.dart';

import '../models/practice_session.dart';
import '../services/practice_history_store.dart';

class PracticeHistoryScreen extends StatefulWidget {
  const PracticeHistoryScreen({super.key});

  @override
  State<PracticeHistoryScreen> createState() => _PracticeHistoryScreenState();
}

class _PracticeHistoryScreenState extends State<PracticeHistoryScreen> {
  final PracticeHistoryStore _store = const PracticeHistoryStore();
  late Future<List<PracticeSession>> _sessions;

  static const Color _orange = Color(0xFFD4842A);

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _sessions = _store.loadSessions();
  }

  String _dateLabel(DateTime value) {
    final local = value.toLocal();
    String twoDigits(int number) => number.toString().padLeft(2, '0');
    return '${twoDigits(local.day)}/${twoDigits(local.month)}/${local.year} '
        '${twoDigits(local.hour)}:${twoDigits(local.minute)}';
  }

  String _durationLabel(int seconds) {
    final minutes = seconds ~/ 60;
    final remainingSeconds = seconds % 60;
    return '${minutes}m ${remainingSeconds}s';
  }

  Future<void> _delete(PracticeSession session) async {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? Colors.white : Colors.black;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: theme.scaffoldBackgroundColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: primaryColor, width: 1.5),
        ),
        title: Text(
          'Delete practice record?',
          style: TextStyle(color: primaryColor, fontWeight: FontWeight.w700),
        ),
        content: Text(
          '${session.scenario.id} - ${session.scenario.title}',
          style: TextStyle(color: primaryColor),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel', style: TextStyle(color: primaryColor.withValues(alpha: 0.6))),
          ),
          FilledButton.tonal(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.red.shade50,
              foregroundColor: Colors.red.shade700,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await _store.deleteSession(session.sessionId);
    if (mounted) setState(_reload);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? Colors.white : Colors.black;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── Header ───
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
              child: Text(
                'Practice\nHistory',
                style: TextStyle(
                  color: primaryColor,
                  fontSize: 34,
                  fontWeight: FontWeight.w800,
                  height: 1.15,
                  letterSpacing: -0.5,
                ),
              ),
            ),
            const SizedBox(height: 20),

            // ─── History List ───
            Expanded(
              child: FutureBuilder<List<PracticeSession>>(
                future: _sessions,
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  final sessions = snapshot.data ?? const [];
                  if (sessions.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.history_edu_outlined,
                              size: 48,
                              color: primaryColor.withValues(alpha: 0.25),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'No practice history yet.',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: primaryColor.withValues(alpha: 0.5),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Complete a scenario to see your results here.',
                              style: TextStyle(
                                fontSize: 13,
                                color: primaryColor.withValues(alpha: 0.35),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }

                  return ListView.separated(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 90),
                    itemCount: sessions.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final session = sessions[index];
                      return _buildHistoryCard(session, isDark, primaryColor);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHistoryCard(PracticeSession session, bool isDark, Color primaryColor) {
    final cardBgColor = isDark ? const Color(0xFF1E293B) : Colors.white;

    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) =>
              PracticeHistoryDetailScreen(session: session),
        ),
      ),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: cardBgColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: primaryColor.withValues(alpha: 0.1),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Score circle
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: _orange.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  session.overallScore.toStringAsFixed(1),
                  style: const TextStyle(
                    color: _orange,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 14),

            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    session.scenario.title,
                    style: TextStyle(
                      color: primaryColor,
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${_dateLabel(session.completedAt)}  ·  '
                    '${_durationLabel(session.durationSeconds)}',
                    style: TextStyle(
                      color: primaryColor.withValues(alpha: 0.5),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),

            // Delete button
            IconButton(
              tooltip: 'Delete record',
              onPressed: () => _delete(session),
              icon: Icon(
                Icons.delete_outline,
                color: primaryColor.withValues(alpha: 0.3),
                size: 20,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class PracticeHistoryDetailScreen extends StatelessWidget {
  final PracticeSession session;

  static const Color _orange = Color(0xFFD4842A);

  const PracticeHistoryDetailScreen({super.key, required this.session});

  String _label(String key) => key
      .split('_')
      .map((word) => '${word[0].toUpperCase()}${word.substring(1)}')
      .join(' ');

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? Colors.white : Colors.black;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: theme.scaffoldBackgroundColor,
        foregroundColor: primaryColor,
        title: Text(session.scenario.id, style: const TextStyle(fontWeight: FontWeight.w700)),
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            session.scenario.title,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: primaryColor,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Score ${session.overallScore.toStringAsFixed(1)} / 5  ·  '
            '${session.studentResponseCount} responses  ·  '
            '${session.status == 'completed' ? 'Completed' : 'Ended manually'}',
            style: TextStyle(
              color: primaryColor.withValues(alpha: 0.5),
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Scores',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: primaryColor,
            ),
          ),
          const Divider(),
          ...session.averageScores.entries.map(
            (entry) => ListTile(
              contentPadding: EdgeInsets.zero,
              dense: true,
              title: Text(
                _label(entry.key),
                style: TextStyle(color: primaryColor),
              ),
              trailing: Text(
                entry.value.toStringAsFixed(1),
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: _orange,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Transcript',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: primaryColor,
            ),
          ),
          const Divider(),
          ...session.transcript.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item['speaker'] ?? '',
                    style: const TextStyle(
                      color: _orange,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    item['message'] ?? '',
                    style: TextStyle(color: primaryColor),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          SelectableText(
            'Session ID: ${session.sessionId}',
            style: TextStyle(
              fontSize: 12,
              color: primaryColor.withValues(alpha: 0.3),
            ),
          ),
        ],
      ),
    );
  }
}
