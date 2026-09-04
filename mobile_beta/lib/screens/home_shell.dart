import 'package:flutter/material.dart';

import 'scenario_selection_screen.dart';

/// Root of the signed-in experience. Primary destinations live in the home
/// header, so the previous bottom navigation is intentionally removed.
class HomeShell extends StatelessWidget {
  const HomeShell({super.key});

  @override
  Widget build(BuildContext context) => const ScenarioSelectionScreen();
}
