// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile_beta/main.dart';

void main() {
  testWidgets('Login screen loads for signed out students', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const EngoraApp(isLoggedIn: false));
    await tester.pump();

    expect(find.bySemanticsLabel('Engora'), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 1800));
    await tester.pumpAndSettle();

    expect(
      find.text('Welcome Back, Glad\nto See You Again.\nSign in to Practice'),
      findsOneWidget,
    );
    expect(find.widgetWithText(TextFormField, 'Email Address'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'Password'), findsOneWidget);
    expect(find.text('Login'), findsOneWidget);
  });
}
