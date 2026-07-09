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
