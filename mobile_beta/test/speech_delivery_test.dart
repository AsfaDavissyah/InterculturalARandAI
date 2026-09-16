import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_beta/models/speech_draft.dart';
import 'package:mobile_beta/models/pending_turn.dart';

void main() {
  test(
    'STT correction replaces partial hypothesis instead of duplicating it',
    () {
      final draft = SpeechDraft()..start();
      draft.update('I would like boat');
      draft.update('I would like both options');
      expect(draft.text, 'I would like both options');
      draft.update('');
      expect(draft.text, 'I would like both options');
    },
  );

  test(
    'continuation preserves edited words and replaces only the new segment',
    () {
      final draft = SpeechDraft()..start(retainedText: 'I would like both.');
      draft.update('Could you');
      draft.update('Could you explain the difference?');
      expect(
        draft.text,
        'I would like both. Could you explain the difference?',
      );
      draft.start();
      expect(draft.text, isEmpty);
    },
  );

  test(
    'failed submission retains confirmed words and rejects concurrent sends',
    () {
      final turn = PendingTurn();
      expect(turn.begin('Both, please.'), isTrue);
      expect(turn.begin('Both, please.'), isFalse);
      turn.finishAttempt();
      expect(turn.text, 'Both, please.');
      expect(turn.begin('A different response'), isFalse);
      expect(turn.begin('Both, please.'), isTrue);
      turn.accept();
      // Audio may still be playing; accepting the response must not unlock send.
      expect(turn.begin('Next response'), isFalse);
      turn.finishAttempt();
      expect(turn.text, isNull);
      expect(turn.begin('Next response'), isTrue);
    },
  );
}
