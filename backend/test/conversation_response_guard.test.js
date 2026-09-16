const assert = require("node:assert/strict");
const test = require("node:test");

// Replace only the generation boundary. No external model call is made.
const service = require("../services/openai_service");
let generatedMessage = "";
service.generateChatResponseWithOpenAI = async () => ({
  ai_message: generatedMessage,
  completed_objective_ids: [],
});
const { app } = require("../backend_core");

test("response guard distinguishes genuine AI dialogue from filtered fallback", async () => {
  const oldEnabled = process.env.USE_OPENAI;
  const oldKey = process.env.OPENAI_API_KEY;
  process.env.USE_OPENAI = "true";
  process.env.OPENAI_API_KEY = "test-placeholder-not-a-real-key";
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const previous = "Would you like to discuss your essay or your research proposal?";
  async function respond(studentResponse) {
    const result = await fetch(`http://127.0.0.1:${server.address().port}/api/chat/respond-turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        setting_id: "ACADEMIC-LECTURER-OFFICE",
        student_response_count: 2,
        student_response: studentResponse,
        conversation_history: [{ speaker: "AI", message: previous }],
      }),
    });
    assert.equal(result.status, 200);
    return result.json();
  }
  try {
    generatedMessage = previous;
    const filtered = await respond("Please help with my essay.");
    assert.equal(filtered.source, "local_fast_fallback");
    assert.equal(filtered.fallback_reason, "openai_repetition_filtered");
    assert.notEqual(filtered.ai_message, previous);

    const repeated = await respond("Please repeat that.");
    assert.equal(repeated.source, "openai_chat");
    assert.equal(repeated.fallback_reason, null);
    assert.equal(repeated.ai_message, previous);

    generatedMessage = "";
    const empty = await respond("Please help with my essay.");
    assert.equal(empty.source, "local_fast_fallback");
    assert.equal(empty.fallback_reason, "openai_chat_failed");
    assert.ok(empty.ai_message);
  } finally {
    if (oldEnabled === undefined) delete process.env.USE_OPENAI;
    else process.env.USE_OPENAI = oldEnabled;
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = oldKey;
    await new Promise((resolve) => server.close(resolve));
  }
});
