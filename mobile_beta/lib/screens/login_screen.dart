import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../services/app_settings.dart';
import '../services/chat_service.dart';
import '../widgets/orbit_logo.dart';
import 'home_shell.dart';
import 'signup_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  
  bool _loading = false;
  String? _errorMessage;

  static const Color _cream = Color(0xFFFFFCF4);
  static const Color _black = Color(0xFF000000);
  static const Color _orange = Color(0xFFD4842A);

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final success = await AuthService.login(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );

      if (!mounted) return;

      if (success) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const HomeShell()),
        );
      } else {
        setState(() {
          _errorMessage = 'Invalid email or password. Please try again.';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Connection error. Check your server address and Wi-Fi.';
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openBackendSettings() async {
    final currentUrl = await AppSettings.getBaseUrl();
    if (!mounted) return;
    final controller = TextEditingController(text: currentUrl);
    String? connectionMessage;
    bool checking = false;

    final newUrl = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            Future<void> checkConnection() async {
              setDialogState(() {
                checking = true;
                connectionMessage = null;
              });
              try {
                final url = AppSettings.normalizeBaseUrl(controller.text);
                await ChatService(baseUrl: url).checkConnection();
                setDialogState(() => connectionMessage = 'Connected ✓');
              } catch (_) {
                setDialogState(() => connectionMessage = 'Cannot connect');
              } finally {
                setDialogState(() => checking = false);
              }
            }

            return PopScope(
              canPop: !checking,
              child: AlertDialog(
                backgroundColor: _cream,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                title: const Text(
                  'Backend Address',
                  style: TextStyle(
                    color: _black,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      controller: controller,
                      enabled: !checking,
                      keyboardType: TextInputType.url,
                      autocorrect: false,
                      style: const TextStyle(color: _black),
                      decoration: InputDecoration(
                        hintText: 'http://192.168.1.8:3000',
                        hintStyle: TextStyle(color: _black.withValues(alpha: 0.3)),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                    if (connectionMessage != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        connectionMessage!,
                        style: TextStyle(
                          color: connectionMessage!.contains('✓')
                              ? Colors.green.shade700
                              : Colors.red.shade700,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ],
                ),
                actions: [
                  TextButton.icon(
                    onPressed: checking ? null : checkConnection,
                    icon: checking
                        ? const SizedBox.square(
                            dimension: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.wifi_tethering_rounded),
                    label: const Text('Test'),
                  ),
                  TextButton(
                    onPressed: checking ? null : () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  FilledButton(
                    onPressed: checking
                        ? null
                        : () => Navigator.pop(context, controller.text.trim()),
                    style: FilledButton.styleFrom(
                      backgroundColor: _orange,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Save'),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
    WidgetsBinding.instance.addPostFrameCallback((_) => controller.dispose());
    if (newUrl == null || newUrl.trim().isEmpty) return;
    await AppSettings.setBaseUrl(newUrl);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _cream,
      appBar: AppBar(
        backgroundColor: _cream,
        elevation: 0,
        actions: [
          IconButton(
            tooltip: 'Server Settings',
            icon: const Icon(Icons.settings_ethernet_rounded, color: _black),
            onPressed: _openBackendSettings,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 20),
                const Row(
                  children: [
                    OrbitLogo(
                      size: 42,
                      showBackground: true,
                      borderRadius: 10,
                    ),
                    SizedBox(width: 12),
                    Text(
                      'Orbit',
                      style: TextStyle(
                        color: _black,
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                const Text(
                  'Welcome back,\nSign in to practice',
                  style: TextStyle(
                    color: _black,
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                    height: 1.2,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 32),
                
                // Form Fields
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  style: const TextStyle(color: _black),
                  decoration: InputDecoration(
                    labelText: 'Email Address',
                    labelStyle: TextStyle(color: _black.withValues(alpha: 0.6)),
                    enabledBorder: OutlineInputBorder(
                      borderSide: const BorderSide(color: _black, width: 1.5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderSide: const BorderSide(color: _orange, width: 2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    errorBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: Colors.red.shade700, width: 1.5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    focusedErrorBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: Colors.red.shade700, width: 2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter your email';
                    }
                    if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value.trim())) {
                      return 'Please enter a valid email address';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),
                
                TextFormField(
                  controller: _passwordController,
                  obscureText: true,
                  style: const TextStyle(color: _black),
                  decoration: InputDecoration(
                    labelText: 'Password',
                    labelStyle: TextStyle(color: _black.withValues(alpha: 0.6)),
                    enabledBorder: OutlineInputBorder(
                      borderSide: const BorderSide(color: _black, width: 1.5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderSide: const BorderSide(color: _orange, width: 2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    errorBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: Colors.red.shade700, width: 1.5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    focusedErrorBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: Colors.red.shade700, width: 2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter your password';
                    }
                    if (value.length < 6) {
                      return 'Password must be at least 6 characters';
                    }
                    return null;
                  },
                ),
                
                if (_errorMessage != null) ...[
                  const SizedBox(height: 20),
                  Text(
                    _errorMessage!,
                    style: TextStyle(
                      color: Colors.red.shade700,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
                
                const SizedBox(height: 36),
                
                // Submit Button (Warm Minimalist Capsule)
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _black,
                      foregroundColor: _cream,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(27),
                      ),
                      elevation: 0,
                    ),
                    child: _loading
                        ? const SizedBox.square(
                            dimension: 20,
                            child: CircularProgressIndicator(
                              color: _cream,
                              strokeWidth: 2,
                            ),
                          )
                        : const Text(
                            'SIGN IN',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.0,
                            ),
                          ),
                  ),
                ),
                
                const SizedBox(height: 24),
                
                // Switch Screen
                Center(
                  child: TextButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const SignupScreen()),
                      );
                    },
                    child: RichText(
                      text: TextSpan(
                        style: const TextStyle(color: _black, fontSize: 14),
                        children: [
                          TextSpan(
                            text: "Don't have an account? ",
                            style: TextStyle(color: _black.withValues(alpha: 0.6)),
                          ),
                          const TextSpan(
                            text: 'Sign Up',
                            style: TextStyle(
                              color: _orange,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
