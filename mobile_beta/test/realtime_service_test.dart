import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_beta/services/realtime_service.dart';

void main() {
  test('Realtime grant parses only the short-lived client credential', () {
    final grant = RealtimeSessionGrant.fromJson({
      'client_secret': 'ek_test_short_lived',
      'expires_at': 1900000000,
      'model': 'gpt-realtime',
      'voice': 'marin',
      'setting_id': realtimePilotSettingId,
      'webrtc_url': 'https://api.openai.com/v1/realtime/calls',
    });

    expect(grant.clientSecret, 'ek_test_short_lived');
    expect(grant.settingId, realtimePilotSettingId);
    expect(grant.webRtcUrl.host, 'api.openai.com');
    expect(grant.model, 'gpt-realtime');
  });

  test('Realtime parser separates learner and agent transcripts', () {
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
}
