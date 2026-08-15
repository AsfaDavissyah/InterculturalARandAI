const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const { app } = require("../server");

function request(app, method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      const payload = body ? JSON.stringify(body) : "";
      const reqHeaders = { ...headers };

      if (body) {
        reqHeaders["Content-Type"] = "application/json";
        reqHeaders["Content-Length"] = Buffer.byteLength(payload);
      }

      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path,
          method,
          headers: reqHeaders,
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
            resolve({ status: res.statusCode, headers: res.headers, body: json, text: data });
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

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const JWT_SECRET = process.env.JWT_SECRET || "intercultural_ai_dev_secret_key_2026_at_least_32_bytes";
const lecturerToken = jwt.sign(
  { userId: "507f1f77bcf86cd799439011", email: "lecturer@icc.com", role: "lecturer", lecturerCode: "LEC-101" },
  JWT_SECRET
);
const authHeaders = { Authorization: `Bearer ${lecturerToken}` };

test("Phase 6 Backend: evaluate-turn attaches coaching_event for pragmatic friction", async () => {
  const res = await request(app, "POST", "/api/chat/evaluate-turn", {
    session_id: "session_coaching_test_001",
    scenario_id: "G-ICC-008",
    student_response_count: 1,
    conversation_history: [],
    student_response: "Just follow me and do what I say bro.",
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.detected_category, "TOO_DIRECT");
  assert.ok(res.body.coaching_event);
  assert.equal(res.body.coaching_event.category, "excessive_directness");
  assert.ok(res.body.coaching_event.short_hint.length > 0);
  assert.ok(res.body.coaching_event.explanation.length > 0);
  assert.ok(res.body.coaching_event.improved_response.length > 0);
});

test("Phase 6 Backend: GET /api/lecturer/students returns student roster", async () => {
  const originalFindById = User.findById;
  const originalFind = User.find;
  User.findById = async () => ({ lecturerCode: "LEC-101" });
  User.find = () => ({
    sort: async () => [
      {
        _id: "507f1f77bcf86cd799439012",
        name: "Test Student",
        email: "student@icc.com",
        gender: "female",
        studentId: "STU-001",
        consent: true,
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    ],
  });
  try {
    const res = await request(app, "GET", "/api/lecturer/students", null, authHeaders);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.equal(res.body[0].studentId, "STU-001");
  } finally {
    User.findById = originalFindById;
    User.find = originalFind;
  }
});

test("Phase 6 Backend: GET /api/lecturer/sessions returns practice sessions list", async () => {
  const res = await request(app, "GET", "/api/lecturer/sessions", null, authHeaders);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.sessions));
});

test("Phase 6 Backend: GET /api/lecturer/analytics returns summary metrics", async () => {
  const res = await request(app, "GET", "/api/lecturer/analytics", null, authHeaders);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(typeof res.body.total_sessions === "number");
  assert.ok(typeof res.body.completion_rate === "number");
  assert.ok(typeof res.body.frequent_coaching_categories === "object");
});

test("Phase 6 Backend: GET /api/lecturer/export/csv exports CSV data", async () => {
  const res = await request(app, "GET", "/api/lecturer/export/csv", null, authHeaders);
  assert.equal(res.status, 200);
  assert.ok(res.headers["content-type"].includes("text/csv"));
  assert.ok(res.text.includes("session_id,student_id,student_name"));
});
