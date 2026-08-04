const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

process.env.USE_OPENAI = "false";

const {
  app,
  buildSessionMemory,
  buildSessionProgress,
  detectCategory,
  detectCompletedObjectives,
  generateAIMessage,
  normalizePracticeSessionPayload,
  serializePracticeSession,
} = require("../server");

const airportScenario = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "data", "g_icc_008_scenario.json"),
    "utf8"
  )
);
const allObjectiveIds = airportScenario.session_rules.required_objective_ids;

test("all workbook scenarios use Scenario Engine V2", () => {
  const files = fs
    .readdirSync(path.join(__dirname, "..", "data"))
    .filter((fileName) => fileName.endsWith("_scenario.json"));
  const scenarios = files.map((fileName) =>
    JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "data", fileName), "utf8")
    )
  );

  assert.equal(scenarios.length, 10);
  for (const scenario of scenarios) {
    assert.equal(scenario.schema_version, "2.0");
    assert.ok(scenario.context?.setting);
    assert.equal(scenario.characters.length, 2);
    assert.ok(scenario.conversation_objectives.length >= 4);
    assert.ok(scenario.conversation_stages.length >= 5);
    assert.ok(scenario.session_rules.required_objective_ids.length >= 4);
    assert.ok(scenario.fallback_responses.GOOD);
  }
});

test("client revisions replace the old G-ICC-008 and N-ICC-005 contexts", () => {
  const cultureScenario = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "data", "n_icc_005_scenario.json"),
      "utf8"
    )
  );

  assert.equal(
    airportScenario.scenario.title,
    "Meeting an International Student on Campus"
  );
  assert.match(airportScenario.context.setting, /International Office/i);
  assert.equal(airportScenario.initial_conversation_state.ai_opening_message, "Hi, excuse me. Are you Rina?");
  assert.equal(cultureScenario.scenario.title, "Talking About Culture on Campus");
  assert.match(cultureScenario.scenario.ai_role, /David/i);
});

test("does not close before the target minimum", () => {
  const progress = buildSessionProgress(airportScenario, 5, allObjectiveIds);

  assert.equal(progress.session_complete, false);
  assert.equal(progress.objectives_completed, true);
});

test("closes naturally from response six when all objectives are complete", () => {
  const progress = buildSessionProgress(airportScenario, 6, allObjectiveIds);

  assert.equal(progress.session_complete, true);
  assert.equal(progress.end_reason, "objectives_completed");
});

test("uses responses nine and ten for objectives that still need repair", () => {
  const progress = buildSessionProgress(airportScenario, 8, [
    "confirm_and_welcome",
  ]);

  assert.equal(progress.session_complete, false);
  assert.ok(progress.remaining_objective_ids.length > 0);
});

test("always closes at the maximum of ten student responses", () => {
  const progress = buildSessionProgress(airportScenario, 10, []);

  assert.equal(progress.session_complete, true);
  assert.equal(progress.end_reason, "maximum_student_responses_reached");
});

test("detects objectives across the full student conversation", () => {
  const completed = detectCompletedObjectives(
    airportScenario,
    [
      { speaker: "AI", message: "Are you the student volunteer?" },
      {
        speaker: "Student",
        message: "Yes, I am Rina. Welcome to our university, David.",
      },
      { speaker: "AI", message: "Thank you." },
      {
        speaker: "Student",
        message: "How was your journey from your accommodation?",
      },
    ],
    "I can show you the library and student center during our campus tour."
  );

  assert.ok(completed.includes("confirm_and_welcome"));
  assert.ok(completed.includes("arrival_small_talk"));
  assert.ok(completed.includes("orient_campus"));
});

test("short replies remain natural conversational turns", () => {
  assert.equal(detectCategory("Yes", airportScenario), "ACCEPTABLE");
  assert.equal(detectCategory("Okay", airportScenario), "ACCEPTABLE");
  assert.equal(detectCategory("Thank you", airportScenario), "ACCEPTABLE");
  assert.equal(detectCategory("...", airportScenario), "SILENCE_OR_UNCLEAR");

  const message = generateAIMessage(
    "ACCEPTABLE",
    airportScenario,
    allObjectiveIds,
    "Yes",
    []
  );
  assert.match(message, /^Great\./);
  assert.doesNotMatch(message, /your (response|answer|meaning)|better to say/i);
});

test("session memory preserves roles, setting, and recent exchanges", () => {
  const history = Array.from({ length: 12 }, (_, index) => ({
    speaker: index % 2 === 0 ? "AI" : "Student",
    message: `Message ${index + 1}`,
  }));
  const memory = buildSessionMemory(
    airportScenario,
    history,
    "Yes, I can show you the library.",
    ["confirm_and_welcome"]
  );

  assert.equal(memory.scenario_id, "G-ICC-008");
  assert.match(memory.setting, /International Office/i);
  assert.match(memory.ai_role, /David/i);
  assert.equal(memory.recent_exchanges.length, 8);
  assert.equal(memory.recent_exchanges.at(-1).speaker, "Student");
  assert.match(memory.recent_exchanges.at(-1).message, /library/i);
});

test("respond-turn preserves the fast chat response contract", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    const response = await fetch(
      `http://127.0.0.1:${port}/api/chat/respond-turn`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: "session_fast_chat_test",
          scenario_id: "G-ICC-008",
          student_response_count: 1,
          conversation_history: [
            { speaker: "AI", message: "Hi, excuse me. Are you Rina?" },
          ],
          student_response: "Yes, welcome to our university.",
          student_display_name: "Alya",
          student_id: "student_001",
        }),
      }
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.session_id, "session_fast_chat_test");
    assert.equal(body.scenario_id, "G-ICC-008");
    assert.equal(body.turn_number, 1);
    assert.equal(body.source, "local_fast_fallback");
    assert.equal(body.fallback_reason, "openai_not_configured");
    assert.equal(body.continue_conversation, true);
    assert.ok(body.ai_message);
    assert.ok(body.session_progress);
    assert.ok(body.session_memory);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("local fallback returns character dialogue without spoken correction", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    const response = await fetch(
      `http://127.0.0.1:${port}/api/chat/evaluate-turn`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: "session_natural_test",
          scenario_id: "G-ICC-008",
          student_response_count: 1,
          conversation_history: [
            { speaker: "AI", message: "Hi, excuse me. Are you Rina?" },
          ],
          student_response: "Yes",
        }),
      }
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.session_id, "session_natural_test");
    assert.equal(body.source, "local_fallback");
    assert.equal(body.fallback_reason, "openai_not_configured");
    assert.match(body.ai_message, /^Great\./);
    assert.doesNotMatch(
      body.ai_message,
      /your (response|answer|meaning)|for example|better to say/i
    );
    assert.ok(body.feedback);
    assert.equal(body.session_memory.scenario_id, "G-ICC-008");
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("evaluate-turn uses student_response_count and returns a natural close", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    const response = await fetch(
      `http://127.0.0.1:${port}/api/chat/evaluate-turn`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario_id: "G-ICC-008",
          student_response_count: 6,
          conversation_history: [
            {
              speaker: "Student",
              message: "Yes, I am Rina. Welcome to our university, David.",
            },
            {
              speaker: "Student",
              message:
                "How was your journey from your accommodation? Do not worry, you will know the campus soon.",
            },
            {
              speaker: "Student",
              message:
                "I am a third-year English Education student and I volunteer to help exchange students.",
            },
            {
              speaker: "Student",
              message:
                "Our campus tour includes the library, faculty building, student center, and cafeteria.",
            },
            {
              speaker: "Student",
              message:
                "It is common to greet lecturers politely and arrive on time for class.",
            },
          ],
          student_response:
            "You can join the English Debate Club or basketball club. Then let us start the tour.",
        }),
      }
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.turn_number, 6);
    assert.equal(body.continue_conversation, false);
    assert.equal(body.end_reason, "objectives_completed");
    assert.match(body.ai_message, /thank you/i);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("N-ICC-005 reaches a natural close from completed cultural objectives", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    const response = await fetch(
      `http://127.0.0.1:${port}/api/chat/evaluate-turn`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario_id: "N-ICC-005",
          student_response_count: 6,
          conversation_history: [
            {
              speaker: "Student",
              message:
                "What is something people misunderstand about Australian culture in your experience?",
            },
            {
              speaker: "Student",
              message:
                "Smiling can show friendliness and respect and make people feel comfortable.",
            },
            {
              speaker: "Student",
              message:
                "Personal questions about age or marriage are often friendly, but privacy and boundaries still matter.",
            },
            {
              speaker: "Student",
              message:
                "People will appreciate your effort to say Terima kasih, Tolong, and Apa kabar.",
            },
            {
              speaker: "Student",
              message:
                "Gotong royong means working together to help the community, similar to volunteering in both cultures.",
            },
          ],
          student_response:
            "Thank you for sharing. Learning about different cultures helps us understand people better.",
        }),
      }
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.turn_number, 6);
    assert.equal(body.continue_conversation, false);
    assert.equal(body.end_reason, "objectives_completed");
    assert.match(body.ai_message, /learned a lot/i);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("all ten scenarios are listed and can evaluate a first response", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    const scenariosResponse = await fetch(
      `http://127.0.0.1:${port}/api/scenarios`
    );
    const scenarios = await scenariosResponse.json();
    assert.equal(scenarios.length, 10);

    for (const scenarioSummary of scenarios) {
      const scenarioResponse = await fetch(
        `http://127.0.0.1:${port}/api/scenarios/${scenarioSummary.scenario_id}`
      );
      const scenario = await scenarioResponse.json();
      const studentResponse =
        scenario.scenario.good_response_examples[0] ||
        "Thank you. Could you tell me a little more?";
      const evaluationResponse = await fetch(
        `http://127.0.0.1:${port}/api/chat/evaluate-turn`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenario_id: scenarioSummary.scenario_id,
            student_response_count: 1,
            conversation_history: [],
            student_response: studentResponse,
          }),
        }
      );
      const evaluation = await evaluationResponse.json();

      assert.equal(evaluationResponse.status, 200);
      assert.equal(evaluation.scenario_id, scenarioSummary.scenario_id);
      assert.ok(evaluation.ai_message);
      assert.equal(evaluation.continue_conversation, true);
      for (const forbiddenTerm of scenario.context.forbidden_terms) {
        assert.equal(
          evaluation.ai_message
            .toLowerCase()
            .includes(String(forbiddenTerm).toLowerCase()),
          false
        );
      }
    }
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("history payload maps between mobile snake_case and MongoDB fields", () => {
  const normalized = normalizePracticeSessionPayload(
    {
      session_id: "session_history_test",
      student: {
        student_id: "student_1",
        display_name: "Rina",
      },
      scenario: {
        scenario_id: "G-ICC-008",
        title: "Meeting an International Student on Campus",
      },
      started_at: "2026-07-12T01:00:00.000Z",
      completed_at: "2026-07-12T01:05:00.000Z",
      duration_seconds: 300,
      status: "ended_manually",
      end_reason: "manual_finish",
      student_response_count: 5,
      transcript: [{ speaker: "Student", message: "Welcome, David." }],
      average_scores: { grammar: 4, politeness: 5 },
      overall_score: 4.5,
      evaluations: [{ turn_number: 1 }],
      completed_objective_ids: ["confirm_and_welcome"],
    },
    "user_1"
  );

  assert.equal(normalized.sessionId, "session_history_test");
  assert.equal(normalized.durationSeconds, 300);
  assert.equal(normalized.studentResponseCount, 5);
  assert.equal(normalized.overallScore, 4.5);
  assert.equal(normalized.averageScores.politeness, 5);

  const serialized = serializePracticeSession(normalized);

  assert.equal(serialized.session_id, "session_history_test");
  assert.equal(serialized.completed_at, "2026-07-12T01:05:00.000Z");
  assert.equal(serialized.duration_seconds, 300);
  assert.equal(serialized.student_response_count, 5);
  assert.equal(serialized.overall_score, 4.5);
  assert.deepEqual(serialized.completed_objective_ids, ["confirm_and_welcome"]);
});

test("guided session metadata survives history normalization and serialization", async () => {
  const normalized = normalizePracticeSessionPayload(
    {
      session_id: "session_guided_history_test",
      student: {
        student_id: "student_2",
        display_name: "Alya",
      },
      scenario: {
        scenario_id: "ACADEMIC-LECTURER-OFFICE",
        title: "Lecturer's Office Consultation",
      },
      experience_type: "guided_topic",
      topic_id: "academic-communication",
      topic_title: "Academic Communication",
      setting_id: "ACADEMIC-LECTURER-OFFICE",
      setting_title: "Lecturer's Office Consultation",
      avatar_key: "female_lecturer_v1",
      launch_source: "module_qr",
      module_id: "module_001",
      unit_id: "unit_01",
      page_id: "page_12",
      coaching_events: [
        {
          turn_number: 1,
          student_utterance: "Hey teacher.",
          hint: "Use a formal academic greeting.",
        },
      ],
      completed_at: "2026-08-04T02:00:00.000Z",
      overall_score: 4.2,
    },
    "507f1f77bcf86cd799439011"
  );

  assert.equal(normalized.experienceType, "guided_topic");
  assert.equal(normalized.topicId, "academic-communication");
  assert.equal(normalized.settingId, "ACADEMIC-LECTURER-OFFICE");
  assert.equal(normalized.avatarKey, "female_lecturer_v1");
  assert.equal(normalized.launchSource, "module_qr");
  assert.equal(normalized.coachingEvents.length, 1);

  const PracticeSession = require("../models/PracticeSession");
  const sessionDocument = new PracticeSession(normalized);
  await sessionDocument.validate();

  const serialized = serializePracticeSession(sessionDocument);
  assert.equal(serialized.experience_type, "guided_topic");
  assert.equal(serialized.topic_id, "academic-communication");
  assert.equal(serialized.topic_title, "Academic Communication");
  assert.equal(serialized.setting_id, "ACADEMIC-LECTURER-OFFICE");
  assert.equal(
    serialized.setting_title,
    "Lecturer's Office Consultation"
  );
  assert.equal(serialized.avatar_key, "female_lecturer_v1");
  assert.equal(serialized.launch_source, "module_qr");
  assert.equal(serialized.module_id, "module_001");
  assert.equal(serialized.unit_id, "unit_01");
  assert.equal(serialized.page_id, "page_12");
  assert.equal(serialized.coaching_events.length, 1);
  assert.equal(
    serialized.coaching_events[0].hint,
    "Use a formal academic greeting."
  );
});
