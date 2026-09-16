/// A recognition callback revises the current segment, not the whole turn.
class SpeechDraft {
  String prefix = '';
  String segment = '';

  String get text => [prefix, segment].where((s) => s.isNotEmpty).join(' ');

  void start({String retainedText = ''}) {
    prefix = retainedText.trim();
    segment = '';
  }

  void update(String words, {bool isFinal = false}) {
    final cleaned = words.trim();
    if (cleaned.isEmpty) return;

    segment = cleaned;
    if (isFinal) {
      prefix = _merge(prefix, segment);
      segment = '';
    }
  }

  String _merge(String stable, String incoming) {
    if (stable.isEmpty) return incoming;

    final stableWords = stable.split(RegExp(r'\s+'));
    final incomingWords = incoming.split(RegExp(r'\s+'));
    final stableLower = stable.toLowerCase();
    final incomingLower = incoming.toLowerCase();

    if (incomingLower == stableLower ||
        stableLower.endsWith(' $incomingLower')) {
      return stable;
    }
    if (incomingLower.startsWith('$stableLower ')) return incoming;

    final maxOverlap = stableWords.length < incomingWords.length
        ? stableWords.length
        : incomingWords.length;
    for (var overlap = maxOverlap; overlap > 0; overlap--) {
      final stableTail = stableWords
          .sublist(stableWords.length - overlap)
          .join(' ')
          .toLowerCase();
      final incomingHead = incomingWords
          .sublist(0, overlap)
          .join(' ')
          .toLowerCase();
      if (stableTail == incomingHead) {
        return [...stableWords, ...incomingWords.skip(overlap)].join(' ');
      }
    }

    return '$stable $incoming';
  }
}
