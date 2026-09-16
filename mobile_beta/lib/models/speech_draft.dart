/// A recognition callback revises the current segment, not the whole turn.
class SpeechDraft {
  String prefix = '';
  String segment = '';

  String get text => _merge(prefix, segment);

  void start({String retainedText = ''}) {
    prefix = retainedText.trim();
    segment = '';
  }

  void update(String words, {bool isFinal = false}) {
    final cleaned = words.trim();
    if (cleaned.isEmpty) return;

    if (segment.isNotEmpty && _startsNewSegment(segment, cleaned)) {
      prefix = _merge(prefix, segment);
    }
    segment = cleaned;
    if (isFinal) {
      prefix = _merge(prefix, segment);
      segment = '';
    }
  }

  bool _startsNewSegment(String previous, String incoming) {
    final previousWords = previous.split(RegExp(r'\s+'));
    final incomingWords = incoming.split(RegExp(r'\s+'));
    if (previousWords.length < 4 || incomingWords.isEmpty) return false;

    final first = incomingWords.first.toLowerCase().replaceAll(
      RegExp(r"[^a-z0-9']"),
      '',
    );
    if (const {
      'and',
      'but',
      'because',
      'so',
      'then',
      'also',
      'however',
    }.contains(first)) {
      return true;
    }

    if (previousWords.length < 6 || incomingWords.length > 4) return false;
    final previousVocabulary = previousWords
        .map((word) => word.toLowerCase().replaceAll(RegExp(r"[^a-z0-9']"), ''))
        .toSet();
    final sharedWords = incomingWords.where((word) {
      final normalized = word.toLowerCase().replaceAll(
        RegExp(r"[^a-z0-9']"),
        '',
      );
      return normalized.isNotEmpty && previousVocabulary.contains(normalized);
    }).length;
    return sharedWords <= 1;
  }

  String _merge(String stable, String incoming) {
    if (stable.isEmpty) return incoming;
    if (incoming.isEmpty) return stable;

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
