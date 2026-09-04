import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_beta/screens/practice_report_screen.dart';
import 'package:mobile_beta/theme/engora_theme.dart';

const reportData = PracticeReportData(
  title: "Lecture's Office Consultation",
  aiName: 'Dr Emma',
  overallScore: 4.2,
  status: 'Ended manually',
  responseCount: 6,
  scores: {
    'grammar': 4.0,
    'vocabulary': 4.2,
    'fluency': 4.1,
    'politeness': 4.6,
    'pragmatic_appropriateness': 4.0,
    'intercultural_awareness': 4.3,
  },
  performanceSummary: 'You completed the academic consultation clearly.',
  doneWell: 'You used a polite greeting and asked a clear question.',
  suggestions: 'Continue practicing polite clarification requests.',
  transcript: [
    PracticeReportTurn(
      speaker: 'Dr Emma',
      message: 'Good morning. How can I help you today?',
      isStudent: false,
      studentTurn: null,
      feedback: '',
    ),
    PracticeReportTurn(
      speaker: 'You',
      message: 'Good morning, Professor. Could I ask about the assignment?',
      isStudent: true,
      studentTurn: 1,
      feedback: 'Clear and appropriately polite.',
    ),
  ],
);

void main() {
  Future<void> pumpReport(WidgetTester tester, PracticeReportMode mode) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        theme: EngoraTheme.light(),
        home: PracticeReportScreen(data: reportData, mode: mode),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('result keeps Back to Home visible on a phone viewport', (
    tester,
  ) async {
    await pumpReport(tester, PracticeReportMode.result);

    expect(find.text('Practice Result'), findsOneWidget);
    expect(find.text('Back to Home'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('history detail reuses report without the sticky home action', (
    tester,
  ) async {
    await pumpReport(tester, PracticeReportMode.history);

    expect(find.text('Practice Details'), findsOneWidget);
    expect(find.text('Back to Home'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
