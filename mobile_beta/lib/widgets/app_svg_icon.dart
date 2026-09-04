import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

abstract final class AppIcons {
  static const String back = 'assets/icons/arrow-small-left.svg';
  static const String open = 'assets/icons/arrow-up-right.svg';
  static const String eye = 'assets/icons/eye.svg';
  static const String eyeCrossed = 'assets/icons/eye-crossed.svg';
  static const String finish = 'assets/icons/flag-alt.svg';
  static const String microphone = 'assets/icons/microphone.svg';
  static const String microphoneSlash = 'assets/icons/microphone-slash.svg';
  static const String qr = 'assets/icons/qr.svg';
  static const String history = 'assets/icons/time-past.svg';
  static const String camera = 'assets/icons/video-camera-alt.svg';
  static const String voiceBot = 'assets/icons/voice-bot.svg';
  static const String userRobot = 'assets/icons/user-robot.svg';
  static const String user = 'assets/icons/circle-user.svg';
  static const String messages = 'assets/icons/messages.svg';
  static const String checkCircle = 'assets/icons/check-circle.svg';
  static const String info = 'assets/icons/info.svg';
  static const String empty = 'assets/icons/empty-set.svg';
  static const String trash = 'assets/icons/trash.svg';
}

class AppSvgIcon extends StatelessWidget {
  final String asset;
  final double size;
  final Color? color;

  const AppSvgIcon(this.asset, {super.key, this.size = 24, this.color});

  @override
  Widget build(BuildContext context) {
    final resolvedColor = color ?? IconTheme.of(context).color;
    return SvgPicture.asset(
      asset,
      width: size,
      height: size,
      fit: BoxFit.contain,
      colorFilter: resolvedColor == null
          ? null
          : ColorFilter.mode(resolvedColor, BlendMode.srcIn),
    );
  }
}
