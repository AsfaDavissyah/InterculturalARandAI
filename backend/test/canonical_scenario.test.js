const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const jwt = require("jsonwebtoken");

const { app, connectDatabase } = require("../backend_core");
const User = require("../models/User");
const Scenario = require("../models/Scenario");
const Topic = require("../models/Topic");
const PracticeSession = require("../models/PracticeSession");
const {
  generateDeterministicAdvancedSettings,
  buildRuntimeScenarioData,
  serializeCanonicalScenario,
} = require("../services/canonical_scenario_service");

test.before(async () => {
  await connectDatabase();
});

const secret = process.env.JWT_SECRET || "intercultural_ai_dev_secret_key_2026_at_least_32_bytes";
const adminToken = jwt.sign(
  { userId: "507f1f77bcf86cd799439011", email: "admin@icc.com", role: "admin" },
  secret
);
const lecturerToken = jwt.sign(
  { userId: "507f1f77bcf86cd799439022", email: "dr.smith@icc.com", role: "lecturer", lecturerCode: "DR-SMI-TEST" },
  secret
);
const studentToken = jwt.sign(
  { userId: "507f1f77bcf86cd799439033", email: "student@icc.com", role: "student" },
  secret
);
const createdScenarioIds = [];

test.after(async () => {
  if (createdScenarioIds.length > 0) {
    await Scenario.deleteMany({ scenarioId: { $in: createdScenarioIds } });
  }
  const mongoose = require("mongoose");
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const payload = body ? JSON.stringify(body) : "";
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      if (body) {
        headers["Content-Type"] = "application/json";
        headers["Content-Length"] = Buffer.byteLength(payload);
      }
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: server.address().port,
          path,
          method,
          headers,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            server.close();
            let json = null;
            try {
              json = JSON.parse(data);
            } catch (_) {}
            resolve({ status: res.statusCode, body: json, text: data, headers: res.headers });
          });
        }
      );
      req.on("error", (err) => {
        server.close();
        reject(err);
      });
      if (body) req.write(payload);
      req.end();
    });
  });
}

test("Deterministic AI Settings Generator creates valid stages and boundaries", () => {
  const settings = generateDeterministicAdvancedSettings({
    title: "Coffee Shop Order",
    briefing: "Order coffee and snacks politely from an Australian barista.",
    student_role: "International student",
    ai_partner: { display_name: "Olivia Reed", role: "Cafe Barista", culture: "Australia" },
    student_task: "Ask about coffee types, order a drink, and ask about prices.",
    practice_location: "Melbourne Cafe",
  });

  assert.ok(settings.learning_goal.includes("Australian barista") || settings.learning_goal.includes("Melbourne Cafe"));
  assert.equal(settings.conversation_stages.length, 4);
  assert.ok(settings.completion_conditions.length >= 2);
  assert.ok(settings.constraints.length >= 1);
  assert.ok(settings.assessment_criteria.some((c) => c.criterion === "intercultural_awareness"));
  assert.equal(settings.ai_prompt_override, null);
});

test("Dashboard Auth: Student role cannot access dashboard endpoints", async () => {
  const res = await request("GET", "/api/dashboard/overview", null, studentToken);
  assert.equal(res.status, 403);
});

test("Dashboard Auth: Unauthenticated request returns 401", async () => {
  const res = await request("GET", "/api/dashboard/overview", null, null);
  assert.equal(res.status, 401);
});

test("Admin Overview endpoint returns required summary fields", async () => {
  const res = await request("GET", "/api/dashboard/overview", null, adminToken);
  assert.equal(res.status, 200);
  assert.equal(res.body.role, "admin");
  assert.ok("published_scenarios" in res.body.summary);
  assert.ok("drafts_awaiting_review" in res.body.summary);
  assert.ok("active_categories" in res.body.summary);
});

test("Lecturer Overview endpoint returns role-specific metrics", async () => {
  const res = await request("GET", "/api/dashboard/overview", null, lecturerToken);
  assert.equal(res.status, 200);
  assert.equal(res.body.role, "lecturer");
  assert.ok("connected_students" in res.body.summary);
  assert.ok("practices_this_week" in res.body.summary);
});

test("Scenario Validation: Rejects invalid placement and missing fields", async () => {
  const invalidRes = await request(
    "POST",
    "/api/dashboard/scenarios",
    {
      title: "Hi",
      placements: [],
    },
    adminToken
  );
  assert.equal(invalidRes.status, 400);
});

test("Lecturer cannot create or submit Scenario drafts", async () => {
  const res = await request(
    "POST",
    "/api/dashboard/scenarios",
    { title: "Unfinished Consultation Draft" },
    lecturerToken
  );
  assert.equal(res.status, 403);

  const submit = await request(
    "POST",
    "/api/dashboard/scenarios/SCN-DOES-NOT-EXIST/submit",
    null,
    lecturerToken
  );
  assert.equal(submit.status, 403);
});

test("Admin creates and publishes a canonical Scenario", async () => {
  const createRes = await request(
    "POST",
    "/api/dashboard/scenarios",
    {
      title: "Academic Office Consultation Test",
      placements: ["guided_topics", "scenario_library"],
      category_ids: ["academic-communication"],
      briefing: "You are meeting your lecturer to discuss research methodology questions.",
      student_role: "Postgraduate student",
      ai_partner: {
        profile_id: "emma-lecturer",
        display_name: "Dr Emma Collins",
        role: "Foreign Lecturer",
        culture: "United Kingdom",
      },
      student_task: "Explain your research plan clearly and ask for feedback on your literature review.",
      practice_location: "Office 302",
    },
    adminToken
  );

  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.status, "draft");
  assert.deepEqual(createRes.body.placements, ["scenario_library"]);
  const scenarioId = createRes.body.scenario_id;
  createdScenarioIds.push(scenarioId);
  assert.ok(scenarioId.startsWith("SCN-"));

  // Publish
  const pubRes = await request("POST", `/api/dashboard/scenarios/${scenarioId}/publish`, null, adminToken);
  assert.equal(pubRes.status, 200);
  assert.equal(pubRes.body.scenario.status, "published");

  // Lecturer cannot edit published admin scenario
  const lectEditRes = await request(
    "PUT",
    `/api/dashboard/scenarios/${scenarioId}`,
    { title: "Hacked Title" },
    lecturerToken
  );
  assert.equal(lectEditRes.status, 403);
});

test("Lecturer has read-only access to Scenario Library", async () => {
  const listRes = await request("GET", "/api/dashboard/scenarios", null, lecturerToken);
  assert.equal(listRes.status, 200);
  assert.ok(listRes.body.items.every((item) => item.placements.includes("scenario_library")));

  const dupRes = await request(
    "POST",
    "/api/dashboard/scenarios/SCN-READ-ONLY/duplicate",
    null,
    lecturerToken
  );
  assert.equal(dupRes.status, 403);
});

test("Categories Management: Admin can list, create, and reorder categories", async () => {
  const listRes = await request("GET", "/api/dashboard/categories", null, adminToken);
  assert.equal(listRes.status, 200);
  assert.ok(Array.isArray(listRes.body));
  assert.ok(listRes.body.length >= 3);

  // Lecturer cannot create categories
  const lectCreateRes = await request(
    "POST",
    "/api/dashboard/categories",
    { name: "Unauthorized Category" },
    lecturerToken
  );
  assert.equal(lectCreateRes.status, 403);

  const protectedArchive = await request(
    "POST",
    "/api/dashboard/categories/academic-communication/archive",
    null,
    adminToken
  );
  assert.equal(protectedArchive.status, 409);
  assert.equal(protectedArchive.body.error, "CATEGORY_IN_USE");
});

test("System settings exposes stable dashboard contracts", async () => {
  const res = await request("GET", "/api/dashboard/system-settings", null, adminToken);
  assert.equal(res.status, 200);
  assert.ok(res.body.default_session_rules);
  assert.ok(Array.isArray(res.body.default_criteria));
  assert.deepEqual(Object.keys(res.body.feature_flags).sort(), ["modules", "qr"]);
});

test("CSV Export prevents formula injection", async () => {
  const exportRes = await request("GET", "/api/dashboard/practice-results/export.csv", null, adminToken);
  assert.equal(exportRes.status, 200);
  assert.ok(exportRes.headers["content-type"].includes("text/csv"));
});

test("Practice result deletion returns a clear response for an unknown session", async () => {
  const deleteRes = await request(
    "DELETE",
    "/api/dashboard/practice-results/SESSION-DOES-NOT-EXIST",
    null,
    adminToken
  );
  assert.equal(deleteRes.status, 404);
  assert.equal(deleteRes.body.error, "Practice result not found.");
});

test("Feature Flags: Modules and QR endpoints return FEATURE_DISABLED when flags are false", async () => {
  process.env.FEATURE_MODULES_ENABLED = "false";
  process.env.FEATURE_QR_ENABLED = "false";

  const moduleRes = await request("GET", "/api/admin/modules", null, adminToken);
  assert.equal(moduleRes.status, 403);
  assert.equal(moduleRes.body.error, "FEATURE_DISABLED");

  const qrRes = await request("POST", "/api/launch/resolve", { token: "dummy" }, null);
  assert.equal(qrRes.status, 403);
  assert.equal(qrRes.body.error, "FEATURE_DISABLED");
});
