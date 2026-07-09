import 'package:flutter/material.dart';
import 'screens/chat_screen.dart';

void main() {
  runApp(const InterculturalAIApp());
}

class InterculturalAIApp extends StatelessWidget {
  const InterculturalAIApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Intercultural AI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: Colors.blue,
      ),
      home: const ChatScreen(),
    );
  }
}