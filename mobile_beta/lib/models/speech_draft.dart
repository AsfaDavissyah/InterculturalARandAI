/// A recognition callback revises the current segment, not the whole turn.
class SpeechDraft {
  String prefix = '';
  String segment = '';

  String get text => [prefix, segment].where((s) => s.isNotEmpty).join(' ');

  void start({String retainedText = ''}) {
    prefix = retainedText.trim();
    segment = '';
  }

  void update(String words) {
    if (words.trim().isNotEmpty) segment = words.trim();
  }
}
