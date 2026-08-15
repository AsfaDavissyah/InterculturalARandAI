const assert = require("node:assert/strict");
const test = require("node:test");
const jwt = require("jsonwebtoken");

process.env.USE_OPENAI = "false";

const { app } = require("../server");
const JWT_SECRET = process.env.JWT_SECRET || "intercultural_ai_dev_secret_key_2026_at_least_32_bytes";

function getAdminToken() {
  return jwt.sign({ userId: "admin_test_001", email: "admin@icc.com", role: "admin" }, JWT_SECRET);
}

function getStudentToken() {
  return jwt.sign({ userId: "student_test_001", email: "student@icc.com", role: "student" }, JWT_SECRET);
}

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

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  return { response, body: await response.json() };
}

test("Admin topic & setting endpoints reject unauthenticated or non-admin requests", async () => {
  await withServer(async (baseUrl) => {
    // No token
    const unauthTopics = await jsonRequest(`${baseUrl}/api/admin/topics`);
    assert.equal(unauthTopics.response.status, 401);

    // Student token
    const studentTopics = await jsonRequest(`${baseUrl}/api/admin/topics`, {
      headers: { Authorization: `Bearer ${getStudentToken()}` },
    });
    assert.equal(studentTopics.response.status, 403);
  });
});

test("Admin can list all topics including non-active ones", async () => {
  await withServer(async (baseUrl) => {
    const { response, body } = await jsonRequest(`${baseUrl}/api/admin/topics`, {
      headers: { Authorization: `Bearer ${getAdminToken()}` },
    });
    assert.equal(response.status, 200);
    assert.ok(body.length >= 3);
    assert.ok(body.some((t) => t.topicId === "academic-communication"));
  });
});

test("Admin can create a new topic and prevent duplicate topicId", async () => {
  await withServer(async (baseUrl) => {
    const adminToken = getAdminToken();

    const newTopic = {
      topicId: "health-communication",
      title: "Health & Medical Communication",
      description: "Practice consulting with doctors and healthcare staff.",
      iconKey: "medical",
      displayOrder: 4,
      languageObjectives: ["Describing symptoms", "Asking for medical advice"],
      iccObjectives: ["Polite medical inquiries", "Privacy boundaries"],
    };

    const createRes = await jsonRequest(`${baseUrl}/api/admin/topics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(newTopic),
    });
    assert.equal(createRes.response.status, 201);
    assert.equal(createRes.body.topicId, "health-communication");

    // Try duplicate creation
    const dupRes = await jsonRequest(`${baseUrl}/api/admin/topics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(newTopic),
    });
    assert.equal(dupRes.response.status, 400);
    assert.match(dupRes.body.error, /already exists/i);
  });
});

test("Admin can create setting and enforces valid response count range", async () => {
  await withServer(async (baseUrl) => {
    const adminToken = getAdminToken();

    const invalidSetting = {
      settingId: "HEALTH-CLINIC",
      topicId: "health-communication",
      title: "Local Clinic Visit",
      location: "Local Health Clinic",
      studentRole: "Patient visiting a clinic",
      aiCharacter: {
        display_name: "Dr Smith",
        role: "General Practitioner",
        culture: "United Kingdom",
        avatar_key: "doctor_v1",
      },
      sessionRules: {
        minimumStudentResponses: 8,
        targetStudentResponsesMin: 5, // invalid: min > targetMin
        targetStudentResponsesMax: 10,
        maximumStudentResponses: 10,
      },
    };

    const invalidRes = await jsonRequest(`${baseUrl}/api/admin/settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(invalidSetting),
    });
    assert.equal(invalidRes.response.status, 400);
    assert.match(invalidRes.body.error, /invalid session response count range/i);

    const validSetting = {
      ...invalidSetting,
      sessionRules: {
        minimumStudentResponses: 5,
        targetStudentResponsesMin: 6,
        targetStudentResponsesMax: 8,
        maximumStudentResponses: 10,
      },
      aiCharacter: {
        display_name: "Dr Smith",
        role: "General Practitioner",
        culture: "United Kingdom",
        avatar_key: "doctor_v1",
      },
      conversationStages: ["greeting", "describe_symptoms", "polite_closing"],
      constraints: ["Stay in the clinic"],
      rubric: { clarity: 5, politeness: 5 },
    };

    const validRes = await jsonRequest(`${baseUrl}/api/admin/settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(validSetting),
    });
    assert.equal(validRes.response.status, 201);
    assert.equal(validRes.body.settingId, "HEALTH-CLINIC");
  });
});

test("Admin setting validation rejects malformed IDs, missing AI roles, and unknown parent topics", async () => {
  await withServer(async (baseUrl) => {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAdminToken()}`,
    };
    const baseSetting = {
      settingId: "PHASE4-VALIDATION",
      topicId: "academic-communication",
      title: "Validation Setting",
      location: "Test Office",
      studentRole: "Student",
      aiCharacter: { display_name: "Dr Test", role: "Lecturer" },
      conversationStages: ["greeting", "closing"],
      rubric: { politeness: 5 },
    };

    const malformed = await jsonRequest(`${baseUrl}/api/admin/settings`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...baseSetting, settingId: "not valid" }),
    });
    assert.equal(malformed.response.status, 400);
    assert.match(malformed.body.error, /uppercase letters/i);

    const missingRole = await jsonRequest(`${baseUrl}/api/admin/settings`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...baseSetting, aiCharacter: { display_name: "Dr Test" } }),
    });
    assert.equal(missingRole.response.status, 400);
    assert.match(missingRole.body.error, /aiCharacter\.role/i);

    const unknownParent = await jsonRequest(`${baseUrl}/api/admin/settings`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...baseSetting, topicId: "unknown-topic" }),
    });
    assert.equal(unknownParent.response.status, 400);
    assert.match(unknownParent.body.error, /parent topic/i);
  });
});

test("Admin can update every guided setting field and archive it", async () => {
  await withServer(async (baseUrl) => {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAdminToken()}`,
    };
    const create = await jsonRequest(`${baseUrl}/api/admin/settings`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        settingId: "PHASE4-CRUD-SETTING",
        topicId: "academic-communication",
        title: "Original Setting",
        location: "Original Location",
        studentRole: "Student",
        aiCharacter: { display_name: "Dr Test", role: "Lecturer", avatar_key: "test_v1" },
        conversationStages: ["greeting"],
        constraints: ["Original constraint"],
        rubric: { politeness: 5 },
        displayOrder: 9,
      }),
    });
    assert.equal(create.response.status, 201);

    const update = await jsonRequest(`${baseUrl}/api/admin/settings/PHASE4-CRUD-SETTING`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        title: "Updated Setting",
        location: "Updated Location",
        briefing: "Updated briefing",
        stickerAssetKey: "updated_sticker",
        studentRole: "Updated student role",
        aiCharacter: { display_name: "Dr Updated", role: "Updated lecturer", avatar_key: "updated_v2" },
        taskInstruction: "Updated task",
        conversationStages: ["greeting", "main_task", "closing"],
        constraints: ["Stay in the updated location"],
        rubric: { clarity: 5, intercultural_awareness: 5 },
        sessionRules: {
          minimumStudentResponses: 5,
          targetStudentResponsesMin: 6,
          targetStudentResponsesMax: 8,
          maximumStudentResponses: 10,
        },
        displayOrder: 10,
      }),
    });
    assert.equal(update.response.status, 200);
    assert.equal(update.body.title, "Updated Setting");
    assert.deepEqual(update.body.conversationStages, ["greeting", "main_task", "closing"]);
    assert.deepEqual(update.body.rubric, { clarity: 5, intercultural_awareness: 5 });
    assert.equal(update.body.displayOrder, 10);
    assert.equal(update.body.version, 2);

    const archive = await jsonRequest(`${baseUrl}/api/admin/settings/PHASE4-CRUD-SETTING`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getAdminToken()}` },
    });
    assert.equal(archive.response.status, 200);
    assert.equal(archive.body.archived, true);
  });
});

test("Archiving a topic also deactivates its related settings in fallback mode", async () => {
  await withServer(async (baseUrl) => {
    const headers = { Authorization: `Bearer ${getAdminToken()}` };
    const result = await jsonRequest(`${baseUrl}/api/admin/topics/health-communication`, {
      method: "DELETE",
      headers,
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.archived, true);

    const settings = await jsonRequest(
      `${baseUrl}/api/admin/settings?topic_id=health-communication`,
      { headers }
    );
    assert.equal(settings.response.status, 200);
    assert.ok(settings.body.every((setting) => setting.isActive === false));
  });
});

test("Lecturer research summary requires a lecturer role", async () => {
  await withServer(async (baseUrl) => {
    const unauthenticated = await jsonRequest(`${baseUrl}/api/lecturer/research-summary`);
    assert.equal(unauthenticated.response.status, 401);

    const admin = await jsonRequest(`${baseUrl}/api/lecturer/research-summary`, {
      headers: { Authorization: `Bearer ${getAdminToken()}` },
    });
    assert.equal(admin.response.status, 403);
  });
});
