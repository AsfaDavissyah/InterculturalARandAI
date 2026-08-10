import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../services/module_launch_service.dart';
import '../services/page_transitions.dart';
import 'guided_setting_briefing_screen.dart';

class ModuleQrScannerScreen extends StatefulWidget {
  const ModuleQrScannerScreen({super.key});

  @override
  State<ModuleQrScannerScreen> createState() => _ModuleQrScannerScreenState();
}

class _ModuleQrScannerScreenState extends State<ModuleQrScannerScreen> {
  static const Color _orange = Color(0xFFD4842A);
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    formats: const [BarcodeFormat.qrCode],
  );
  final ModuleLaunchService _service = const ModuleLaunchService();
  bool _resolving = false;
  String? _error;

  Future<void> _handleCapture(BarcodeCapture capture) async {
    if (_resolving) return;
    final value = capture.barcodes
        .map((barcode) => barcode.rawValue)
        .whereType<String>()
        .firstOrNull;
    if (value == null || value.trim().isEmpty) return;

    setState(() {
      _resolving = true;
      _error = null;
    });
    await _controller.stop();
    try {
      final launch = await _service.resolve(value);
      if (!mounted) return;
      await Navigator.pushReplacement(
        context,
        SlideUpRoute(
          page: GuidedSettingBriefingScreen(
            topic: launch.topic,
            setting: launch.setting,
            launchSource: 'module_qr',
            moduleId: launch.moduleId,
            unitId: launch.unitId,
            pageId: launch.pageId,
            moduleTitle: launch.moduleTitle,
            pageInstructions: launch.pageInstructions,
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _resolving = false;
        _error = error.toString().replaceFirst('Exception: ', '');
      });
      await _controller.start();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(controller: _controller, onDetect: _handleCapture),
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      IconButton.filledTonal(
                        tooltip: 'Back',
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back_rounded),
                      ),
                      const Expanded(
                        child: Text(
                          'Scan Learning Module',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      IconButton.filledTonal(
                        tooltip: 'Toggle flashlight',
                        onPressed: _controller.toggleTorch,
                        icon: const Icon(Icons.flashlight_on_rounded),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                Container(
                  width: 250,
                  height: 250,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.white, width: 3),
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                const SizedBox(height: 24),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 180),
                  child: _resolving
                      ? const Row(
                          key: ValueKey('resolving'),
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: _orange,
                              ),
                            ),
                            SizedBox(width: 12),
                            Text(
                              'Opening activity...',
                              style: TextStyle(color: Colors.white),
                            ),
                          ],
                        )
                      : Text(
                          _error ?? 'Place the printed QR code inside the frame.',
                          key: ValueKey(_error ?? 'ready'),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: _error == null ? Colors.white : Colors.red.shade200,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
                const Spacer(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
