const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  Topic,
  Setting,
  normalizeRuntimeContext,
} = require("../backend_core");

const PracticeSession = require("../models/PracticeSession");

const airportScenario = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "data", "g_icc_008_scenario.json"),
    "utf8"
  )
);

test("Topic model validates required fields correctly", async () => {
  const topic = new Topic({
    topicId: "academic-communication",
    title: "Academic Communication",
    description: "Practice interacting in academic university settings.",
    iconKey: "school",
    languageObjectives: ["Greeting a lecturer", "Asking questions politely"],
    iccObjectives: ["Formal address", "Respectful disagreement"],
  });

  await topic.validate();
  assert.equal(topic.topicId, "academic-communication");
  assert.equal(topic.isActive, true);
  assert.equal(topic.displayOrder, 0);
});

test("Setting model validates required fields correctly", async () => {
  const setting = new Setting({
    settingId: "ACADEMIC-LECTURER-OFFICE",
    topicId: "academic-communication",
    title: "Lecturer's Office Consultation",
    location: "Lecturer's Office",
    studentRole: "Student attending a consultation",
    aiCharacter: {
      display_name: "Dr Emma Collins",
      role: "Foreign lecturer",
      culture: "United Kingdom",
      avatar_key: "female_lecturer_v1",
    },
    taskInstruction: "Greet the lecturer, explain academic concern, ask for clarification.",
    sessionRules: {
      minimumStudentResponses: 5,
      targetStudentResponsesMin: 6,
      targetStudentResponsesMax: 8,
      maximumStudentResponses: 10,
    },
  });

  await setting.validate();
  assert.equal(setting.settingId, "ACADEMIC-LECTURER-OFFICE");
  assert.equal(setting.aiCharacter.display_name, "Dr Emma Collins");
  assert.equal(setting.sessionRules.targetStudentResponsesMin, 6);
});

test("PracticeSession model accepts optional topic, setting, and coaching fields", async () => {
  const session = new PracticeSession({
    userId: "60d5ecb8b3b3b3b3b3b3b3b3",
    sessionId: "session_topic_test_001",
    scenario: {
      scenario_id: "ACADEMIC-LECTURER-OFFICE",
      title: "Lecturer's Office Consultation",
    },
    experienceType: "guided_topic",
    topicId: "academic-communication",
    topicTitle: "Academic Communication",
    settingId: "ACADEMIC-LECTURER-OFFICE",
    settingTitle: "Lecturer's Office Consultation",
    avatarKey: "female_lecturer_v1",
    launchSource: "module_qr",
    moduleId: "mod_001",
    unitId: "unit_01",
    pageId: "page_12",
    coachingEvents: [
      {
        student_utterance: "Hey prof",
        hint: "Use formal greeting",
      },
    ],
    overallScore: 4.5,
  });

  await session.validate();
  assert.equal(session.experienceType, "guided_topic");
  assert.equal(session.launchSource, "module_qr");
  assert.equal(session.coachingEvents.length, 1);
});

test("normalizeRuntimeContext converts legacy scenario to standardized runtime context", () => {
  const normalized = normalizeRuntimeContext(airportScenario);

  assert.equal(normalized.experience_type, "legacy_scenario");
  assert.equal(normalized.scenario_id, "G-ICC-008");
  assert.equal(normalized.title, "Meeting an International Student on Campus");
  assert.match(normalized.location, /International Office/i);
  assert.match(normalized.student_role, /Rina/i);
  assert.match(normalized.ai_character.display_name, /David/i);
  assert.equal(normalized.session_rules.minimum_student_responses, 5);
  assert.equal(normalized.session_rules.maximum_student_responses, 10);
});

test("normalizeRuntimeContext converts guided setting to standardized runtime context", () => {
  const settingData = {
    settingId: "ACADEMIC-LECTURER-OFFICE",
    topicId: "academic-communication",
    title: "Lecturer's Office Consultation",
    location: "Lecturer's Office",
    studentRole: "Student attending a consultation",
    aiCharacter: {
      display_name: "Dr Emma Collins",
      role: "Foreign lecturer",
      culture: "United Kingdom",
      avatar_key: "female_lecturer_v1",
    },
    conversationStages: ["stage1_greeting", "stage2_concern"],
    constraints: ["Do not speak informally"],
    rubric: { polite_address: 5 },
    sessionRules: {
      minimumStudentResponses: 5,
      targetStudentResponsesMin: 6,
      targetStudentResponsesMax: 8,
      maximumStudentResponses: 10,
    },
  };

  const topicData = {
    topicId: "academic-communication",
    languageObjectives: ["Greeting a lecturer"],
    iccObjectives: ["Formal address"],
  };

  const normalized = normalizeRuntimeContext(settingData, topicData);

  assert.equal(normalized.experience_type, "guided_topic");
  assert.equal(normalized.scenario_id, "ACADEMIC-LECTURER-OFFICE");
  assert.equal(normalized.topic_id, "academic-communication");
  assert.equal(normalized.setting_id, "ACADEMIC-LECTURER-OFFICE");
  assert.equal(normalized.title, "Lecturer's Office Consultation");
  assert.equal(normalized.location, "Lecturer's Office");
  assert.equal(normalized.student_role, "Student attending a consultation");
  assert.equal(normalized.ai_character.display_name, "Dr Emma Collins");
  assert.equal(normalized.ai_character.avatar_key, "female_lecturer_v1");
  assert.deepEqual(normalized.language_objectives, ["Greeting a lecturer"]);
  assert.deepEqual(normalized.icc_objectives, ["Formal address"]);
  assert.equal(normalized.session_rules.minimum_student_responses, 5);
  assert.equal(normalized.session_rules.maximum_student_responses, 10);
  assert.equal(normalized.ai_character.avatar_key, "female_lecturer_v1");
});

test("guided runtime never uses the 2D sticker as an avatar fallback", () => {
  const normalized = normalizeRuntimeContext({
    settingId: "ACADEMIC-AFTER-CLASS",
    topicId: "academic-communication",
    title: "After-Class Academic Discussion",
    location: "International classroom",
    studentRole: "Student approaching a lecturer after class",
    aiCharacter: {
      display_name: "Dr Emma Collins",
      role: "Foreign lecturer",
    },
    stickerAssetKey: "sticker_academic_classroom",
  });

  assert.equal(normalized.ai_character.avatar_key, "default_avatar");
  assert.notEqual(
    normalized.ai_character.avatar_key,
    "sticker_academic_classroom"
  );
});
