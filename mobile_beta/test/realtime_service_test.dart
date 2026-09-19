import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_beta/services/realtime_service.dart';

void main() {
  test('Realtime manual turns explicitly disable VAD', () {
    final event = buildRealtimeManualTurnSessionUpdate();
    final session = event['session'] as Map<String, dynamic>;
    final audio = session['audio'] as Map<String, dynamic>;
    final input = audio['input'] as Map<String, dynamic>;

    expect(event['type'], 'session.update');
    expect(session['type'], 'realtime');
    expect(input.containsKey('turn_detection'), isTrue);
    expect(input['turn_detection'], isNull);
  });

  test('Realtime grant parses only the short-lived client credential', () {
    final grant = RealtimeSessionGrant.fromJson({
      'client_secret': 'ek_test_short_lived',
      'expires_at': 1900000000,
      'model': 'gpt-realtime',
      'voice': 'marin',
      'setting_id': realtimePilotSettingId,
      'research_session_id': 'session_research_1',
      'realtime_session_id': 'sess_realtime_1',
      'webrtc_url': 'https://api.openai.com/v1/realtime/calls',
    });

    expect(grant.clientSecret, 'ek_test_short_lived');
    expect(grant.settingId, realtimePilotSettingId);
    expect(grant.webRtcUrl.host, 'api.openai.com');
    expect(grant.model, 'gpt-realtime');
    expect(grant.researchSessionId, 'session_research_1');
    expect(grant.realtimeSessionId, 'sess_realtime_1');
  });

  test('Realtime parser separates learner and agent transcripts', () {
    final learnerDelta = parseRealtimeServerEvent(
      '{"type":"conversation.item.input_audio_transcription.delta",'
      '"item_id":"student-1","delta":"Could you "}',
    );
    final learner = parseRealtimeServerEvent(
      '{"type":"conversation.item.input_audio_transcription.completed",'
      '"item_id":"student-1",'
      '"transcript":"Could you repeat that?"}',
    );
    final agent = parseRealtimeServerEvent(
      '{"type":"response.output_audio_transcript.delta",'
      '"item_id":"agent-1","delta":"Of course."}',
    );
    final completedAgent = parseRealtimeServerEvent(
      '{"type":"response.output_audio_transcript.done",'
      '"item_id":"agent-1",'
      '"transcript":"Of course. Let me repeat that."}',
    );

    expect(learner.itemId, 'student-1');
    expect(learnerDelta.inputTranscriptDelta, 'Could you ');
    expect(learner.inputTranscript, 'Could you repeat that?');
    expect(learner.transcriptDelta, isNull);
    expect(agent.itemId, 'agent-1');
    expect(agent.transcriptDelta, 'Of course.');
    expect(agent.inputTranscript, isNull);
    expect(completedAgent.itemId, 'agent-1');
    expect(
      completedAgent.completedTranscript,
      'Of course. Let me repeat that.',
    );
  });

  test('Realtime usage is parsed, aggregated, and costed per response', () {
    final event = parseRealtimeServerEvent(
      '{"type":"response.done","response":{"usage":{'
      '"input_token_details":{"text_tokens":119,"audio_tokens":13,'
      '"cached_tokens_details":{"text_tokens":64,"audio_tokens":0}},'
      '"output_token_details":{"text_tokens":30,"audio_tokens":91}}}}',
    );
    final usage = event.usage!;
    final total = usage + usage;

    expect(usage.responseCount, 1);
    expect(usage.inputAudioTokens, 13);
    expect(usage.outputAudioTokens, 91);
    expect(usage.estimatedResponseCostUsd, closeTo(0.0069656, 0.0000001));
    expect(total.responseCount, 2);
    expect(total.estimatedResponseCostUsd, closeTo(0.0139312, 0.0000001));
  });

  test('Realtime response guard permits only one request at a time', () {
    expect(
      shouldCreateRealtimeResponse(
        responseActive: false,
        responseRequested: false,
      ),
      isTrue,
    );
    expect(
      shouldCreateRealtimeResponse(
        responseActive: true,
        responseRequested: false,
      ),
      isFalse,
    );
    expect(
      shouldCreateRealtimeResponse(
        responseActive: false,
        responseRequested: true,
      ),
      isFalse,
    );
  });

  test('Live input deltas are never committed as learner turns', () {
    final delta = parseRealtimeServerEvent(
      '{"type":"conversation.item.input_audio_transcription.delta",'
      '"item_id":"item-1","delta":"The"}',
    );
    final completed = parseRealtimeServerEvent(
      '{"type":"conversation.item.input_audio_transcription.completed",'
      '"item_id":"item-1","transcript":"The first option is Friday."}',
    );

    expect(
      resolveCompletedRealtimeInputTranscript(
        delta,
        accumulatedDraft: 'The',
      ),
      isNull,
    );
    expect(
      resolveCompletedRealtimeInputTranscript(
        completed,
        accumulatedDraft: 'The first option is Friday.',
      ),
      'The first option is Friday.',
    );
  });
}
