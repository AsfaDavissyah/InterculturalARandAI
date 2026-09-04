import 'package:flutter/material.dart';

import '../models/practice_session.dart';
import '../services/practice_history_store.dart';
import '../theme/engora_theme.dart';
import '../widgets/app_svg_icon.dart';
import 'practice_report_screen.dart';

class PracticeHistoryScreen extends StatefulWidget {
  const PracticeHistoryScreen({super.key});

  @override
  State<PracticeHistoryScreen> createState() => _PracticeHistoryScreenState();
}

class _PracticeHistoryScreenState extends State<PracticeHistoryScreen> {
  final PracticeHistoryStore _store = const PracticeHistoryStore();
  late Future<List<PracticeSession>> _sessions;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _sessions = _store.loadSessions();
  }

  DateTime _dateOnly(DateTime value) {
    final local = value.toLocal();
    return DateTime(local.year, local.month, local.day);
  }

  String _groupLabel(DateTime value) {
    final date = _dateOnly(value);
    final today = _dateOnly(DateTime.now());
    final difference = today.difference(date).inDays;
    if (difference == 0) return 'Today';
    if (difference == 1) return 'Yesterday';

    const weekdays = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return '${weekdays[date.weekday - 1]}, ${date.day} '
        '${months[date.month - 1]} ${date.year}';
  }

  String _timeLabel(DateTime value) {
    final local = value.toLocal();
    String twoDigits(int number) => number.toString().padLeft(2, '0');
    return '${twoDigits(local.hour)}:${twoDigits(local.minute)}';
  }

  Future<void> _delete(PracticeSession session) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: EngoraColors.line),
        ),
        title: const Text(
          'Delete this practice?',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        content: Text(
          'This will permanently remove ${_sessionTitle(session)} from your history.',
          style: const TextStyle(color: EngoraColors.muted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
              backgroundColor: EngoraColors.danger,
              foregroundColor: Colors.white,
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

  String _sessionTitle(PracticeSession session) {
    final settingTitle = session.settingTitle?.trim() ?? '';
    return settingTitle.isEmpty ? session.scenario.title : settingTitle;
  }

  void _openDetail(PracticeSession session) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PracticeHistoryDetailScreen(session: session),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EngoraColors.background,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 18, 24, 10),
              child: SizedBox(
                height: 52,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    const Text(
                      'Practice History',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: IconButton(
                        tooltip: 'Back',
                        onPressed: () => Navigator.pop(context),
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
            ),
            Expanded(
              child: FutureBuilder<List<PracticeSession>>(
                future: _sessions,
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  final sessions = [...?snapshot.data]
                    ..sort(
                      (left, right) =>
                          right.completedAt.compareTo(left.completedAt),
                    );
                  if (sessions.isEmpty) {
                    return const _EmptyHistory();
                  }

                  final groups = <DateTime, List<PracticeSession>>{};
                  for (final session in sessions) {
                    groups
                        .putIfAbsent(
                          _dateOnly(session.completedAt),
                          () => <PracticeSession>[],
                        )
                        .add(session);
                  }

                  return ListView(
                    padding: const EdgeInsets.fromLTRB(24, 10, 24, 30),
                    children: [
                      for (final group in groups.entries) ...[
                        Padding(
                          padding: const EdgeInsets.only(top: 12, bottom: 7),
                          child: Text(
                            _groupLabel(group.key),
                            style: const TextStyle(
                              color: EngoraColors.muted,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        for (
                          var index = 0;
                          index < group.value.length;
                          index++
                        ) ...[
                          _HistoryCard(
                            session: group.value[index],
                            title: _sessionTitle(group.value[index]),
                            time: _timeLabel(group.value[index].completedAt),
                            onOpen: () => _openDetail(group.value[index]),
                            onDelete: () => _delete(group.value[index]),
                          ),
                          if (index < group.value.length - 1)
                            const SizedBox(height: 9),
                        ],
                      ],
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyHistory extends StatelessWidget {
  const _EmptyHistory();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(34, 20, 34, 80),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppSvgIcon(AppIcons.empty, size: 142, color: EngoraColors.track),
            const SizedBox(height: 28),
            const Text(
              'No practice yet',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            const Text(
              'Complete your first speaking practice and your progress will appear here.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: EngoraColors.muted,
                fontSize: 13,
                height: 1.35,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  final PracticeSession session;
  final String title;
  final String time;
  final VoidCallback onOpen;
  final VoidCallback onDelete;

  const _HistoryCard({
    required this.session,
    required this.title,
    required this.time,
    required this.onOpen,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onOpen,
        child: Container(
          constraints: const BoxConstraints(minHeight: 122),
          padding: const EdgeInsets.fromLTRB(15, 14, 14, 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: EngoraColors.line),
          ),
          child: Column(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const CircleAvatar(
                    radius: 19,
                    backgroundColor: EngoraColors.background,
                    child: AppSvgIcon(
                      AppIcons.voiceBot,
                      color: EngoraColors.brand,
                      size: 19,
                    ),
                  ),
                  const SizedBox(width: 11),
                  Expanded(
                    child: Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15,
                        height: 1.15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    time,
                    style: const TextStyle(
                      color: EngoraColors.muted,
                      fontSize: 11.5,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Text(
                      '${session.overallScore.toStringAsFixed(1)} / 5',
                      style: EngoraTheme.display(
                        fontSize: 27,
                        color: EngoraColors.brand,
                        height: 1,
                      ),
                    ),
                  ),
                  _HistoryAction(
                    tooltip: 'Delete practice',
                    onTap: onDelete,
                    borderColor: EngoraColors.danger,
                    child: const AppSvgIcon(
                      AppIcons.trash,
                      color: EngoraColors.danger,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 8),
                  _HistoryAction(
                    tooltip: 'View practice details',
                    onTap: onOpen,
                    backgroundColor: EngoraColors.brand,
                    borderColor: EngoraColors.brand,
                    child: const AppSvgIcon(
                      AppIcons.open,
                      color: Colors.white,
                      size: 17,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HistoryAction extends StatelessWidget {
  final String tooltip;
  final VoidCallback onTap;
  final Widget child;
  final Color backgroundColor;
  final Color borderColor;

  const _HistoryAction({
    required this.tooltip,
    required this.onTap,
    required this.child,
    required this.borderColor,
    this.backgroundColor = Colors.white,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkResponse(
        onTap: onTap,
        radius: 24,
        child: Container(
          width: 38,
          height: 38,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: backgroundColor,
            shape: BoxShape.circle,
            border: Border.all(color: borderColor),
          ),
          child: child,
        ),
      ),
    );
  }
}

class PracticeHistoryDetailScreen extends StatelessWidget {
  final PracticeSession session;

  const PracticeHistoryDetailScreen({super.key, required this.session});

  @override
  Widget build(BuildContext context) {
    return PracticeReportScreen(
      mode: PracticeReportMode.history,
      data: PracticeReportData.fromSession(session),
    );
  }
}
