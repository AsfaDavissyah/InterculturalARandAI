const assert = require("node:assert/strict");
const test = require("node:test");

process.env.USE_OPENAI = "false";

const { app } = require("../server");
const {
  buildGuidedScenarioData,
} = require("../services/guided_scenario_service");
const { buildSystemPrompt } = require("../services/openai_service");
const {
  topicsData,
  settingsData,
} = require("../scripts/seed_topics_and_settings");

async function withServer(run) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}

async function jsonRequest(url, options) {
  const response = await fetch(url, options);
  return { response, body: await response.json() };
}

test("public topic API exposes three ordered guided topics", async () => {
  await withServer(async (baseUrl) => {
    const { response, body } = await jsonRequest(`${baseUrl}/api/topics`);
    assert.equal(response.status, 200);
    assert.equal(body.length, 3);
    assert.deepEqual(
      body.map((topic) => topic.topic_id),
      ["academic-communication", "social-communication", "professional-communication"]
    );
    assert.ok(body.every((topic) => topic.language_objectives.length > 0));
    assert.ok(body.every((topic) => topic.icc_objectives.length > 0));
  });
});

test("topic detail and setting list use the public snake-case contract", async () => {
  await withServer(async (baseUrl) => {
    const topicResult = await jsonRequest(
      `${baseUrl}/api/topics/academic-communication`
    );
    assert.equal(topicResult.response.status, 200);
    assert.equal(topicResult.body.topic_id, "academic-communication");

    const settingsResult = await jsonRequest(
      `${baseUrl}/api/topics/academic-communication/settings`
    );
    assert.equal(settingsResult.response.status, 200);
    assert.equal(settingsResult.body.length, 2);
    assert.deepEqual(
      settingsResult.body.map((setting) => setting.setting_id),
      ["ACADEMIC-LECTURER-OFFICE", "ACADEMIC-AFTER-CLASS"]
    );
    assert.ok(settingsResult.body.every((setting) => setting.avatar_key));
    assert.ok(settingsResult.body.every((setting) => setting.sticker_asset_key));
  });
});

test("setting detail inherits topic objectives and exposes runtime assets", async () => {
  await withServer(async (baseUrl) => {
    const { response, body } = await jsonRequest(
      `${baseUrl}/api/settings/ACADEMIC-LECTURER-OFFICE`
    );
    assert.equal(response.status, 200);
    assert.equal(body.ai_character.display_name, "Dr Emma Collins");
    assert.equal(body.avatar_key, "female_lecturer_v1");
    assert.equal(body.sticker_asset_key, "sticker_lecturer_office");
    assert.equal(
      body.opening_message,
      "Good morning. Please come in. How can I help you today?"
    );
    assert.ok(body.language_objectives.length >= 5);
    assert.ok(body.icc_objectives.length >= 5);
    assert.equal(body.session_rules.maximum_student_responses, 10);
  });
});

test("all six guided settings expose distinct context-specific openings", () => {
  const openings = settingsData.map((setting) => {
    const topic = topicsData.find((item) => item.topicId === setting.topicId);
    return buildGuidedScenarioData(setting, topic).initial_conversation_state
      .ai_opening_message;
  });

  assert.equal(new Set(openings).size, settingsData.length);
  assert.match(openings[0], /come in/i);
  assert.match(openings[2], /good evening/i);
  assert.match(openings[3], /get started/i);
  assert.match(openings[4], /introducing yourself/i);
  assert.match(openings[5], /career fair/i);
});

test("unknown topics and settings return 404", async () => {
  await withServer(async (baseUrl) => {
    const topic = await jsonRequest(`${baseUrl}/api/topics/not-real`);
    const setting = await jsonRequest(`${baseUrl}/api/settings/NOT-REAL`);
    assert.equal(topic.response.status, 404);
    assert.equal(setting.response.status, 404);
  });
});

test("all six guided settings resolve through fast respond-turn without drift", async () => {
  await withServer(async (baseUrl) => {
    for (const setting of settingsData) {
      const { response, body } = await jsonRequest(
        `${baseUrl}/api/chat/respond-turn`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: `phase3_${setting.settingId}`,
            topic_id: setting.topicId,
            setting_id: setting.settingId,
            student_response_count: 1,
            student_response: "Hello. It is nice to meet you.",
            student_display_name: "Alya",
          }),
        }
      );
      assert.equal(response.status, 200, setting.settingId);
      assert.equal(body.scenario_id, setting.settingId);
      assert.equal(body.experience_type, "guided_topic");
      assert.equal(body.topic_id, setting.topicId);
      assert.equal(body.setting_id, setting.settingId);
      assert.equal(body.avatar_key, setting.aiCharacter.avatar_key);
      assert.equal(body.session_memory.setting, setting.location);
      assert.match(body.session_memory.ai_role, new RegExp(setting.aiCharacter.display_name, "i"));
      assert.doesNotMatch(body.ai_message, /your response|better to say|for example/i);
      assert.ok((body.ai_message.match(/[.!?]/g) || []).length <= 2);
    }
  });
});

test("setting ID remains accepted through scenario_id for mobile compatibility", async () => {
  await withServer(async (baseUrl) => {
    const { response, body } = await jsonRequest(
      `${baseUrl}/api/chat/respond-turn`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario_id: "SOCIAL-LONDON-RESTAURANT",
          student_response_count: 1,
          student_response: "Good evening. Could I see the menu, please?",
        }),
      }
    );
    assert.equal(response.status, 200);
    assert.equal(body.experience_type, "guided_topic");
    assert.equal(body.setting_id, "SOCIAL-LONDON-RESTAURANT");
  });
});

test("topic and setting mismatch is rejected", async () => {
  await withServer(async (baseUrl) => {
    const { response, body } = await jsonRequest(
      `${baseUrl}/api/chat/respond-turn`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: "academic-communication",
          setting_id: "SOCIAL-MELBOURNE-CAFE",
          student_response_count: 1,
          student_response: "Hello.",
        }),
      }
    );
    assert.equal(response.status, 400);
    assert.match(body.message, /does not belong/i);
  });
});

test("guided evaluate-turn keeps detailed scoring outside the fast chat call", async () => {
  await withServer(async (baseUrl) => {
    const { response, body } = await jsonRequest(
      `${baseUrl}/api/chat/evaluate-turn`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: "professional-communication",
          setting_id: "PROFESSIONAL-INTERVIEW-ROOM",
          student_response_count: 1,
          student_response: "Good morning. Thank you for this opportunity.",
        }),
      }
    );
    assert.equal(response.status, 200);
    assert.equal(body.source, "local_fallback");
    assert.equal(body.experience_type, "guided_topic");
    assert.ok(body.scores);
    assert.ok(body.feedback);
    assert.doesNotMatch(body.ai_message, /score|your response|better to say/i);
  });
});

test("guided runtime and prompt lock identity, location, objectives, and rubric", () => {
  const setting = settingsData[0];
  const topic = topicsData.find((item) => item.topicId === setting.topicId);
  const runtime = buildGuidedScenarioData(setting, topic);
  const prompt = buildSystemPrompt(runtime, { displayName: "Alya" });

  assert.equal(runtime.experience_type, "guided_topic");
  assert.equal(runtime.characters[0].name, "Student");
  assert.match(prompt, /Dr Emma Collins/);
  assert.match(prompt, /Lecturer's Office/);
  assert.match(prompt, /language_objectives/);
  assert.match(prompt, /icc_objectives/);
  assert.match(prompt, /polite_address/);
  assert.match(prompt, /never assign the learner a fictional name/i);
});
