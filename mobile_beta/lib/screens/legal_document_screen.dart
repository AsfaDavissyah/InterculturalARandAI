import 'package:flutter/material.dart';

import '../theme/engora_theme.dart';
import '../widgets/app_svg_icon.dart';

enum LegalDocumentType { privacy, terms, aiNotice, support }

class LegalDocumentScreen extends StatelessWidget {
  final LegalDocumentType type;

  const LegalDocumentScreen({super.key, required this.type});

  String get _title => switch (type) {
    LegalDocumentType.privacy => 'Privacy',
    LegalDocumentType.terms => 'Terms of Use',
    LegalDocumentType.aiNotice => 'AI Notice',
    LegalDocumentType.support => 'Help & Support',
  };

  List<(String, String)> get _sections => switch (type) {
    LegalDocumentType.privacy => const [
      (
        'Data we process',
        'Engora processes account details, research consent, confirmed speech transcripts, AI responses, practice scores, objectives, duration, turn counts, latency, and technical logs needed to provide and secure the service.',
      ),
      (
        'Microphone and camera',
        'Microphone input is used for speaking practice and speech recognition. Camera access is used when an AR or scanning feature is enabled. The production privacy policy must state whether raw audio or camera frames are retained.',
      ),
      (
        'Service providers',
        'AI, hosting, database, and distribution providers process data only as required to operate Engora. The final public policy will name the providers selected by the publisher.',
      ),
      (
        'Research participation',
        'Research participation is voluntary. Research consent is separate from ordinary use, and published research results must use anonymized or aggregated data.',
      ),
      (
        'Your choices',
        'You may request access, correction, export, consent withdrawal, or deletion. Account deletion removes your Engora account and associated practice records.',
      ),
      (
        'Publisher contact',
        'Publisher legal name, privacy email, retention periods, and the final policy URL will be completed before public store submission.',
      ),
    ],
    LegalDocumentType.terms => const [
      (
        'Learning purpose',
        'Engora supports intercultural English practice and research activities. It does not replace professional, legal, medical, or formal academic advice.',
      ),
      (
        'Responsible use',
        'Do not submit unlawful, abusive, confidential, or third-party personal information. Do not attempt to bypass access controls or disrupt the service.',
      ),
      (
        'Availability',
        'AI, speech recognition, network, and assessment features can be incomplete or inaccurate. Features may be changed or temporarily unavailable for maintenance.',
      ),
      (
        'Research and ownership',
        'The final publisher, support contact, intellectual-property terms, and governing terms will be confirmed before public release.',
      ),
    ],
    LegalDocumentType.aiNotice => const [
      (
        'You are speaking with AI',
        'Conversation partners, speech, feedback, and some assessments are generated or assisted by artificial intelligence.',
      ),
      (
        'Outputs can be wrong',
        'AI may misunderstand speech, repeat itself, omit words, or provide inaccurate and culturally inappropriate content. Review important information independently.',
      ),
      (
        'Report a response',
        'Use the flag icon beside an AI transcript response to report content that is incorrect, irrelevant, repeated, incomplete, inappropriate, or otherwise concerning.',
      ),
      (
        'Human oversight',
        'Authorized lecturers and administrators may review reported responses and consented research sessions.',
      ),
    ],
    LegalDocumentType.support => const [
      (
        'Technical support',
        'Before public release, the publisher will provide a monitored support email and website for login, audio, account, and accessibility issues.',
      ),
      (
        'Privacy requests',
        'Account deletion is available from Profile. Other privacy requests will be handled through the publisher privacy contact shown in the final store listing.',
      ),
      (
        'Urgent concerns',
        'Do not use Engora for emergencies or time-critical professional advice.',
      ),
    ],
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: 'Back',
          onPressed: () => Navigator.pop(context),
          icon: const AppSvgIcon(AppIcons.back, size: 24),
        ),
        title: Text(_title),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.fromLTRB(24, 18, 24, 40),
        itemCount: _sections.length,
        separatorBuilder: (_, _) => const Divider(height: 30),
        itemBuilder: (context, index) {
          final section = _sections[index];
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(section.$1, style: EngoraTheme.display(fontSize: 18)),
              const SizedBox(height: 8),
              Text(
                section.$2,
                style: const TextStyle(color: EngoraColors.muted, height: 1.55),
              ),
            ],
          );
        },
      ),
    );
  }
}
