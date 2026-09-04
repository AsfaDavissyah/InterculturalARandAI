import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import '../theme/engora_theme.dart';
import '../widgets/app_svg_icon.dart';
import 'home_shell.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _studentIdController = TextEditingController();
  final _lecturerCodeController = TextEditingController();

  String _selectedGender = 'female';
  bool _termsAccepted = false;
  bool _researchConsentAccepted = false;
  bool _obscurePassword = true;
  bool _loading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _studentIdController.dispose();
    _lecturerCodeController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_termsAccepted || !_researchConsentAccepted) {
      setState(() {
        _errorMessage = 'Please accept both required agreements to continue.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = null;
    });
    try {
      final success = await AuthService.signup(
        name: _nameController.text.trim(),
        email: _emailController.text.trim(),
        password: _passwordController.text,
        gender: _selectedGender,
        studentId: _studentIdController.text.trim(),
        studentLecturerCode: _lecturerCodeController.text.trim().toUpperCase(),
        consent: _researchConsentAccepted,
      );
      if (!mounted) return;
      if (success) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const HomeShell()),
          (_) => false,
        );
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _errorMessage = error.toString().replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showDocument(String title, String body) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: EngoraColors.background,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: EngoraTheme.display(fontSize: 23)),
              const SizedBox(height: 14),
              Text(body, style: const TextStyle(height: 1.5)),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Close'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String hint,
    TextInputType? keyboardType,
    bool obscureText = false,
    Widget? suffixIcon,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      decoration: InputDecoration(hintText: hint, suffixIcon: suffixIcon),
      validator: validator,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                IconButton(
                  tooltip: 'Back',
                  onPressed: () => Navigator.pop(context),
                  icon: const AppSvgIcon(AppIcons.back, size: 24),
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.white,
                    minimumSize: const Size(46, 46),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Create an Account,\nStart Practicing\nNow.',
                  style: EngoraTheme.display(fontSize: 31, height: 1.42),
                ),
                const SizedBox(height: 24),
                _field(
                  controller: _nameController,
                  hint: 'Full Name',
                  keyboardType: TextInputType.name,
                  validator: (value) {
                    if ((value?.trim().length ?? 0) < 3) {
                      return 'Enter your full name';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 9),
                _field(
                  controller: _emailController,
                  hint: 'Email Address',
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) {
                    final email = value?.trim() ?? '';
                    if (email.isEmpty || !email.contains('@')) {
                      return 'Enter a valid email address';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 9),
                _field(
                  controller: _passwordController,
                  hint: 'Password',
                  obscureText: _obscurePassword,
                  suffixIcon: IconButton(
                    tooltip: _obscurePassword
                        ? 'Show password'
                        : 'Hide password',
                    onPressed: () =>
                        setState(() => _obscurePassword = !_obscurePassword),
                    icon: AppSvgIcon(
                      _obscurePassword ? AppIcons.eyeCrossed : AppIcons.eye,
                      size: 20,
                    ),
                  ),
                  validator: (value) => (value?.length ?? 0) < 6
                      ? 'Password must be at least 6 characters'
                      : null,
                ),
                const SizedBox(height: 9),
                _field(
                  controller: _studentIdController,
                  hint: 'Student ID / NIM',
                  keyboardType: TextInputType.number,
                  validator: (value) => (value?.trim().isEmpty ?? true)
                      ? 'Enter your Student ID / NIM'
                      : null,
                ),
                const SizedBox(height: 9),
                _field(
                  controller: _lecturerCodeController,
                  hint: 'Lecturer Research Code',
                  validator: (value) => (value?.trim().isEmpty ?? true)
                      ? 'Enter the research code from your lecturer'
                      : null,
                ),
                const SizedBox(height: 14),
                const Text(
                  'Select Gender',
                  style: TextStyle(color: EngoraColors.muted, fontSize: 13),
                ),
                const SizedBox(height: 7),
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: EngoraColors.track,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    children: [
                      _genderOption('male', 'Male'),
                      const SizedBox(width: 6),
                      _genderOption('female', 'Female'),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                _ConsentRow(
                  value: _termsAccepted,
                  text:
                      'I agree to the Terms of Service and acknowledge the Privacy Policy.',
                  linkLabel: 'View terms',
                  onChanged: (value) => setState(() => _termsAccepted = value),
                  onOpen: () => _showDocument(
                    'Terms & Privacy',
                    'This short notice will be replaced with the approved Terms of Service and Privacy Policy. The two documents explain the rules for using the application and how account and practice data are handled.',
                  ),
                ),
                _ConsentRow(
                  value: _researchConsentAccepted,
                  text:
                      'I have read the Research Information Sheet and voluntarily consent to participate in this research.',
                  linkLabel: 'Research information',
                  onChanged: (value) =>
                      setState(() => _researchConsentAccepted = value),
                  onOpen: () => _showDocument(
                    'Research Information',
                    'This application supports research on intercultural communication and AI-assisted language learning. The study may collect profile details, conversation transcripts, scores, session activity, and technical logs. Participation is voluntary and research results will be presented in anonymized form.',
                  ),
                ),
                if (_errorMessage != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    _errorMessage!,
                    style: const TextStyle(
                      color: EngoraColors.danger,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _loading ? null : _submit,
                    child: _loading
                        ? const SizedBox.square(
                            dimension: 20,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : const Text('Sign Up'),
                  ),
                ),
                const SizedBox(height: 8),
                Center(
                  child: TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text.rich(
                      TextSpan(
                        text: 'Already have an account? ',
                        style: TextStyle(color: EngoraColors.muted),
                        children: [
                          TextSpan(
                            text: 'Login',
                            style: TextStyle(
                              color: EngoraColors.brand,
                              fontWeight: FontWeight.w600,
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

  Widget _genderOption(String value, String label) {
    final selected = _selectedGender == value;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: () => setState(() => _selectedGender = value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          height: 46,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? EngoraColors.brand : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : EngoraColors.muted,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}

class _ConsentRow extends StatelessWidget {
  final bool value;
  final String text;
  final String linkLabel;
  final ValueChanged<bool> onChanged;
  final VoidCallback onOpen;

  const _ConsentRow({
    required this.value,
    required this.text,
    required this.linkLabel,
    required this.onChanged,
    required this.onOpen,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 30,
            height: 30,
            child: Checkbox(
              value: value,
              onChanged: (next) => onChanged(next ?? false),
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(text, style: const TextStyle(fontSize: 12, height: 1.3)),
                InkWell(
                  onTap: onOpen,
                  child: Text(
                    linkLabel,
                    style: const TextStyle(
                      color: EngoraColors.brand,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
