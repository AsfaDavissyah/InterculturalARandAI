const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "intercultural_ai_dev_secret_key_2026_at_least_32_bytes";

test("Realtime configuration is scoped to the lecturer office pilot", () => {
  const {
    buildRealtimeSessionConfig,
    isRealtimePilotSetting,
  } = require("../services/realtime_service");

  const config = buildRealtimeSessionConfig({
    scenarioData: {
      scenario: {
        title: "Lecturer's Office Consultation",
        ai_role: "Dr Emma Collins, foreign lecturer",
        student_role: "Student attending a consultation",
        task_instruction: "Ask for academic guidance.",
      },
      context: { setting: "Lecturer's office" },
    },
    student: { name: "Alya" },
  });

  assert.equal(isRealtimePilotSetting("ACADEMIC-LECTURER-OFFICE"), true);
  assert.equal(isRealtimePilotSetting("SOCIAL-LONDON-RESTAURANT"), false);
  assert.equal(config.type, "realtime");
  assert.deepEqual(config.output_modalities, ["audio"]);
  assert.equal(config.audio.input.turn_detection, null);
  assert.match(config.instructions, /Alya/);
  assert.match(config.instructions, /one or two short sentences/i);
  assert.match(config.instructions, /learner to speak first/i);
  assert.match(config.instructions, /faithfully repeat your immediately previous/i);
});

test("authenticated student receives an ephemeral secret without exposing the API key", async () => {
  const previousFetch = global.fetch;
  const previousEnabled = process.env.OPENAI_REALTIME_ENABLED;
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_REALTIME_ENABLED = "true";
  process.env.OPENAI_API_KEY = "sk-production-key-must-not-leak";

  let upstreamRequest;
  let upstreamCalls = 0;
  global.fetch = async (url, options) => {
    upstreamCalls += 1;
    upstreamRequest = { url, options };
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          id: "sess_realtime_test",
          client_secret: { value: "ek_test_ephemeral", expires_at: 1900000000 },
        };
      },
    };
  };

  const { app } = require("../backend_core");
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));

  try {
    const token = jwt.sign(
      { userId: "507f1f77bcf86cd799439011", email: "student@example.com", role: "student" },
      JWT_SECRET,
      { expiresIn: "5m" }
    );
    const unauthorized = await previousFetch(
      `http://127.0.0.1:${server.address().port}/api/realtime/session`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Connection: "close" },
        body: JSON.stringify({ setting_id: "ACADEMIC-LECTURER-OFFICE" }),
      }
    );
    assert.equal(unauthorized.status, 401);

    const rejectedSetting = await previousFetch(
      `http://127.0.0.1:${server.address().port}/api/realtime/session`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Connection: "close",
        },
        body: JSON.stringify({ setting_id: "SOCIAL-LONDON-RESTAURANT" }),
      }
    );
    assert.equal(rejectedSetting.status, 403);
    assert.equal(upstreamCalls, 0);

    const response = await previousFetch(
      `http://127.0.0.1:${server.address().port}/api/realtime/session`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Connection: "close",
        },
        body: JSON.stringify({
          scenario_id: "ACADEMIC-LECTURER-OFFICE",
          setting_id: "ACADEMIC-LECTURER-OFFICE",
          research_session_id: "session_research_test_12345678",
          topic_id: "academic-communication",
          student_display_name: "Alya",
        }),
      }
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.client_secret, "ek_test_ephemeral");
    assert.equal(body.setting_id, "ACADEMIC-LECTURER-OFFICE");
    assert.equal(body.research_session_id, "session_research_test_12345678");
    assert.equal(body.realtime_session_id, "sess_realtime_test");
    assert.equal(upstreamCalls, 1);
    assert.equal(JSON.stringify(body).includes(process.env.OPENAI_API_KEY), false);
    assert.match(upstreamRequest.url, /realtime\/client_secrets$/);
    assert.equal(
      upstreamRequest.options.headers.Authorization,
      `Bearer ${process.env.OPENAI_API_KEY}`
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    global.fetch = previousFetch;
    if (previousEnabled === undefined) delete process.env.OPENAI_REALTIME_ENABLED;
    else process.env.OPENAI_REALTIME_ENABLED = previousEnabled;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});
