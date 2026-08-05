import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../widgets/orbit_logo.dart';
import 'scenario_selection_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  bool _cameraGranted = false;
  bool _micGranted = false;

  final List<Map<String, String>> _slides = const [
    {
      'title': 'Orbis Partner',
      'subtitle': 'Intercultural English Speaking Practice',
      'description':
          'Engage directly with 3D AI conversation partners based on real-world academic and international campus scenarios.',
    },
    {
      'title': 'Camera & Microphone Permissions',
      'subtitle': 'Real-Time Voice & AR Avatar Experience',
      'description':
          'Enable microphone for speech recognition and camera to display 3D avatar visualizers in your room.',
    },
    {
      'title': 'Ready for Practice!',
      'subtitle': 'Instant Evaluation & Feedback',
      'description':
          'Respond to AI conversations, complete communicative goals, and receive scores for Grammar, Fluency, & Intercultural Awareness.',
    },
  ];

  Future<void> _requestPermissions() async {
    try {
      final cameras = await availableCameras();
      final speech = SpeechToText();
      final micAvailable = await speech.initialize();

      if (mounted) {
        setState(() {
          _cameraGranted = cameras.isNotEmpty;
          _micGranted = micAvailable;
        });
      }
    } catch (e) {
      debugPrint('Permission check error: $e');
    }
  }

  void _onNext() {
    if (_currentPage < _slides.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      _finishOnboarding();
    }
  }

  void _finishOnboarding() {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => const ScenarioSelectionScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      OrbisLogo(size: 24, color: Colors.orangeAccent),
                      SizedBox(width: 8),
                      Text(
                        'Orbis',
                        style: TextStyle(
                          color: Colors.orangeAccent,
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                    ],
                  ),
                  TextButton(
                    onPressed: _finishOnboarding,
                    child: const Text(
                      'Lewati',
                      style: TextStyle(color: Colors.white60),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: (page) => setState(() => _currentPage = page),
                itemCount: _slides.length,
                itemBuilder: (context, index) {
                  final slide = _slides[index];
                  final iconData = index == 1
                      ? Icons.camera_front_rounded
                      : Icons.insights_rounded;

                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 28),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(28),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.orange.withValues(alpha: 0.12),
                            border: Border.all(
                              color: Colors.orange.withValues(alpha: 0.3),
                              width: 2,
                            ),
                          ),
                          child: index == 0
                              ? const OrbisLogo(
                                  size: 70,
                                  color: Colors.orangeAccent,
                                )
                              : Icon(
                                  iconData,
                                  size: 80,
                                  color: Colors.orangeAccent,
                                ),
                        ),
                        const SizedBox(height: 36),
                        Text(
                          slide['title']!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          slide['subtitle']!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.orangeAccent,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          slide['description']!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 14,
                            height: 1.5,
                          ),
                        ),
                        if (index == 1) ...[
                          const SizedBox(height: 24),
                          ElevatedButton.icon(
                            onPressed: _requestPermissions,
                            icon: const Icon(Icons.security_rounded),
                            label: Text(
                              _cameraGranted && _micGranted
                                  ? '✓ Devices Ready'
                                  : 'Check Camera & Microphone',
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _cameraGranted && _micGranted
                                  ? Colors.green.shade800
                                  : Colors.orange.shade800,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 20,
                                vertical: 12,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      _slides.length,
                      (index) => AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: _currentPage == index ? 24 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: _currentPage == index
                              ? Colors.orangeAccent
                              : Colors.white24,
                          borderRadius: BorderRadius.circular(99),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _onNext,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.orangeAccent,
                        foregroundColor: Colors.black,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        _currentPage == _slides.length - 1
                            ? 'Start Practice Now'
                            : 'Continue',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
