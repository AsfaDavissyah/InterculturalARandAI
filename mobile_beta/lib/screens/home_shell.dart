import 'dart:ui';
import 'package:flutter/material.dart';

import 'scenario_selection_screen.dart';
import 'practice_history_screen.dart';

/// Shell widget that hosts the bottom tab navigation with Home and History tabs.
/// Uses an [IndexedStack] to preserve state when switching between tabs.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _currentIndex = 0;
  late final PageController _pageController;

  final List<Widget> _pages = const [
    ScenarioSelectionScreen(),
    PracticeHistoryScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _pageController = PageController(initialPage: _currentIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Stack(
        children: [
          PageView(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() => _currentIndex = index);
            },
            children: _pages,
          ),
          // Floating Toggle-style Navigation Bar at the bottom center
          Positioned(
            left: 0,
            right: 0,
            bottom: 26,
            child: Center(
              child: _buildBottomNavToggle(theme, isDark),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNavToggle(ThemeData theme, bool isDark) {
    const double capsuleWidth = 160.0;
    const double capsuleHeight = 86.0;
    
    // Uniform padding on all sides of the toggle button (8.0 on top/bottom/left/right)
    const double uniformPadding = 8.0;
    
    // Circle size dynamically fits the capsule height minus double padding
    const double circleSize = capsuleHeight - (2.0 * uniformPadding); // 86.0 - 16.0 = 70.0
    
    // Exact absolute horizontal offsets to guarantee perfect side paddings
    const double leftActivePos = uniformPadding; // 8.0
    const double rightActivePos = capsuleWidth - circleSize - uniformPadding; // 150.0 - 70.0 - 8.0 = 72.0
    
    final double activeLeft = _currentIndex == 0 ? leftActivePos : rightActivePos;
    
    // Exact center positions for the background inactive icons
    const double leftIconCenter = leftActivePos + (circleSize / 2.0); // 43.0
    const double rightIconCenter = rightActivePos + (circleSize / 2.0); // 107.0
    
    const double iconBoxSize = 48.0;
    const double iconSize = 28.0;

    final primaryTextColor = isDark ? Colors.white : Colors.black;
    final activeBgColor = isDark ? const Color(0xFF1E293B) : const Color(0xFFFFFCF4);

    return ClipRRect(
      borderRadius: BorderRadius.circular(capsuleHeight / 2),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10.0, sigmaY: 10.0),
        child: Container(
          width: capsuleWidth,
          height: capsuleHeight,
          decoration: BoxDecoration(
            color: isDark 
                ? Colors.white.withValues(alpha: 0.08) 
                : Colors.black.withValues(alpha: 0.05), // Subtle transparent glass fill
            borderRadius: BorderRadius.circular(capsuleHeight / 2),
            border: Border.all(
              color: primaryTextColor, // Dynamic color border to match dark/light theme
              width: 1.8,
            ),
          ),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              // 1. Inactive Home Icon (Background layer, centered exactly in the left slot)
              Positioned(
                left: leftIconCenter - (iconBoxSize / 2.0),
                top: (capsuleHeight - iconBoxSize) / 2.0,
                child: SizedBox(
                  width: iconBoxSize,
                  height: iconBoxSize,
                  child: Center(
                    child: Icon(
                      Icons.home_rounded,
                      color: primaryTextColor.withValues(alpha: 0.4),
                      size: iconSize,
                    ),
                  ),
                ),
              ),

              // 2. Inactive History Icon (Background layer, centered exactly in the right slot)
              Positioned(
                left: rightIconCenter - (iconBoxSize / 2.0),
                top: (capsuleHeight - iconBoxSize) / 2.0,
                child: SizedBox(
                  width: iconBoxSize,
                  height: iconBoxSize,
                  child: Center(
                    child: Icon(
                      Icons.history_rounded,
                      color: primaryTextColor.withValues(alpha: 0.4),
                      size: iconSize,
                    ),
                  ),
                ),
              ),

              // 3. Sliding Active Indicator Circle (Contains active black icon, always 100% centered inside the circle)
              AnimatedPositioned(
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeInOutCubic,
                left: activeLeft,
                top: uniformPadding,
                child: Container(
                  width: circleSize,
                  height: circleSize,
                  decoration: BoxDecoration(
                    color: activeBgColor, // Cream active circle toggle handle
                    shape: BoxShape.circle,
                    boxShadow: const [
                      BoxShadow(
                        color: Colors.black12,
                        blurRadius: 4,
                        offset: Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Center(
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 150),
                      child: Icon(
                        _currentIndex == 0 ? Icons.home_rounded : Icons.history_rounded,
                        key: ValueKey<int>(_currentIndex),
                        color: primaryTextColor,
                        size: iconSize,
                      ),
                    ),
                  ),
                ),
              ),

              // 4. Tap Overlay: Left Half (Switches to Home)
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                width: capsuleWidth / 2.0,
                child: GestureDetector(
                  onTap: () {
                    if (_currentIndex != 0) {
                      _pageController.animateToPage(
                        0,
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                      );
                    }
                  },
                  behavior: HitTestBehavior.opaque,
                ),
              ),

              // 5. Tap Overlay: Right Half (Switches to History)
              Positioned(
                right: 0,
                top: 0,
                bottom: 0,
                width: capsuleWidth / 2.0,
                child: GestureDetector(
                  onTap: () {
                    if (_currentIndex != 1) {
                      _pageController.animateToPage(
                        1,
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                      );
                    }
                  },
                  behavior: HitTestBehavior.opaque,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
