// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';

import 'package:mobile_beta/main.dart';

void main() {
  testWidgets('Login screen loads for signed out students', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const InterculturalAISpeakingBetaApp(isLoggedIn: false),
    );
    await tester.pumpAndSettle();

    expect(find.text('Welcome back,\nSign in to practice'), findsOneWidget);
    expect(find.text('Email Address'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
    expect(find.text('SIGN IN'), findsOneWidget);
  });
}
