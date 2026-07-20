import 'package:flutter/material.dart';
import 'package:o3d/o3d.dart';
import 'ar_avatar.dart'; // Untuk mendapatkan enum AvatarActivity

class ArAvatar3d extends StatefulWidget {
  final String modelPath;
  final AvatarActivity activity;

  const ArAvatar3d({
    super.key,
    required this.modelPath,
    required this.activity,
  });

  @override
  State<ArAvatar3d> createState() => _ArAvatar3dState();
}

class _ArAvatar3dState extends State<ArAvatar3d> {
  late O3DController _o3dController;

  @override
  void initState() {
    super.initState();
    _o3dController = O3DController();
  }

  @override
  void didUpdateWidget(covariant ArAvatar3d oldWidget) {
    super.didUpdateWidget(oldWidget);
    
    // Ganti animasi menggunakan setter controller secara reaktif saat activity berubah
    if (oldWidget.activity != widget.activity) {
      _updateAnimation();
    }
  }

  void _updateAnimation() {
    final String targetAnimation = widget.activity == AvatarActivity.speaking ? 'Talking' : 'Idle';
    
    // Gunakan setter bawaan O3DController untuk mengganti nama animasi
    _o3dController.animationName = targetAnimation;
  }

  @override
  Widget build(BuildContext context) {
    final String initialAnimation = widget.activity == AvatarActivity.speaking ? 'Talking' : 'Idle';

    return Semantics(
      label: 'AI 3D avatar, ${widget.activity.name}',
      child: O3D(
        controller: _o3dController,
        src: widget.modelPath,
        autoPlay: true,
        animationName: initialAnimation,
        cameraControls: false, // Kunci kamera agar mahasiswa tidak memutar-mutar model secara tidak sengaja
        ar: false, // Gunakan camera preview native, bukan bawaan ARCore webview
        autoRotate: false,
        backgroundColor: Colors.transparent, // Sangat penting agar feed kamera belakang terlihat
        cameraOrbit: CameraOrbit(0, 80, 1.8),
        cameraTarget: CameraTarget(0, 1.25, 0),
      ),
    );
  }
}
