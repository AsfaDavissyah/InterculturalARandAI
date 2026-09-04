const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const jwt = require("jsonwebtoken");

process.env.FEATURE_MODULES_ENABLED = "true";
process.env.FEATURE_QR_ENABLED = "true";

const { app } = require("../server");
const LearningModule = require("../models/LearningModule");
const LearningUnit = require("../models/LearningUnit");
const LearningPage = require("../models/LearningPage");
const LaunchToken = require("../models/LaunchToken");
const Setting = require("../models/Setting");

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const payload = body ? JSON.stringify(body) : "";
      const req = http.request({
        hostname: "127.0.0.1",
        port: server.address().port,
        path,
        method,
        headers: {
          ...headers,
          ...(body ? {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          } : {}),
        },
      }, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          server.close();
          let json = null;
          try { json = JSON.parse(data); } catch (_) {}
          resolve({ status: res.statusCode, body: json, text: data });
        });
      });
      req.on("error", (error) => { server.close(); reject(error); });
      if (body) req.write(payload);
      req.end();
    });
  });
}

function leanResult(value) {
  return { lean: async () => value };
}

const secret = process.env.JWT_SECRET || "intercultural_ai_dev_secret_key_2026_at_least_32_bytes";
const adminToken = jwt.sign(
  { userId: "507f1f77bcf86cd799439011", email: "admin@icc.com", role: "admin" },
  secret
);
const authHeaders = { Authorization: `Bearer ${adminToken}` };

test("Phase 7 models expose stable module, page, and hashed-token fields", () => {
  assert.ok(LearningModule.schema.path("moduleId"));
  assert.ok(LearningUnit.schema.path("unitId"));
  assert.ok(LearningPage.schema.path("settingId"));
  assert.ok(LaunchToken.schema.path("tokenHash"));
  assert.equal(LaunchToken.schema.path("token"), undefined);
});

test("Phase 7 admin can create a learning module", async () => {
  const originals = {
    exists: LearningModule.exists,
    create: LearningModule.create,
  };
  LearningModule.exists = async () => null;
  LearningModule.create = async (payload) => ({
    _id: "module-db-id",
    ...payload,
    createdAt: new Date("2026-08-10T00:00:00.000Z"),
    updatedAt: new Date("2026-08-10T00:00:00.000Z"),
  });
  try {
    const response = await request("POST", "/api/admin/modules", {
      module_id: "ICC-MODULE-01",
      title: "Intercultural Speaking Module",
    }, authHeaders);
    assert.equal(response.status, 201);
    assert.equal(response.body.module_id, "ICC-MODULE-01");
    assert.equal(response.body.title, "Intercultural Speaking Module");
  } finally {
    LearningModule.exists = originals.exists;
    LearningModule.create = originals.create;
  }
});

test("Phase 7 QR generation returns a scannable one-time launch value", async () => {
  const originals = {
    pageFindOne: LearningPage.findOne,
    moduleFindOne: LearningModule.findOne,
    unitFindOne: LearningUnit.findOne,
    settingFindOne: Setting.findOne,
    tokenCreate: LaunchToken.create,
  };
  const page = {
    _id: "page-db-id",
    pageId: "ICC-PAGE-01",
    moduleId: "ICC-MODULE-01",
    unitId: "ICC-UNIT-01",
    title: "Meet a Foreign Lecturer",
    settingId: "ACADEMIC-LECTURER-OFFICE",
    isActive: true,
  };
  LearningPage.findOne = () => leanResult(page);
  LearningModule.findOne = () => leanResult({ moduleId: page.moduleId, isActive: true });
  LearningUnit.findOne = () => leanResult({ unitId: page.unitId, isActive: true });
  Setting.findOne = () => leanResult({ settingId: page.settingId, isActive: true });
  LaunchToken.create = async (payload) => ({ _id: "token-db-id", ...payload });
  try {
    const response = await request(
      "POST",
      `/api/admin/pages/${page.pageId}/launch-token`,
      { expires_in_days: 30 },
      authHeaders
    );
    assert.equal(response.status, 201);
    assert.match(response.body.launch_uri, /^engora:\/\/launch\?token=/);
    assert.match(response.body.qr_data_url, /^data:image\/png;base64,/);
    assert.equal(response.body.page.page_id, page.pageId);
    assert.ok(response.body.token.length >= 40);
  } finally {
    LearningPage.findOne = originals.pageFindOne;
    LearningModule.findOne = originals.moduleFindOne;
    LearningUnit.findOne = originals.unitFindOne;
    Setting.findOne = originals.settingFindOne;
    LaunchToken.create = originals.tokenCreate;
  }
});

test("Phase 7 resolver rejects invalid QR activities", async () => {
  const original = LaunchToken.findOne;
  LaunchToken.findOne = async () => null;
  try {
    const response = await request("POST", "/api/launch/resolve", {
      token: "engora://launch?token=invalid-token",
    });
    assert.equal(response.status, 404);
    assert.match(response.body.error, /invalid or inactive/i);
  } finally {
    LaunchToken.findOne = original;
  }
});

test("Phase 7 resolver returns guided setting and module references", async () => {
  const originals = {
    tokenFindOne: LaunchToken.findOne,
    moduleFindOne: LearningModule.findOne,
    unitFindOne: LearningUnit.findOne,
    pageFindOne: LearningPage.findOne,
  };
  const tokenDocument = {
    moduleId: "ICC-MODULE-01",
    unitId: "ICC-UNIT-01",
    pageId: "ICC-PAGE-01",
    settingId: "ACADEMIC-LECTURER-OFFICE",
    expiresAt: new Date(Date.now() + 60000),
    isActive: true,
    scanCount: 0,
    save: async () => {},
  };
  LaunchToken.findOne = async () => tokenDocument;
  LearningModule.findOne = () => leanResult({
    moduleId: tokenDocument.moduleId,
    title: "Intercultural Speaking Module",
    isActive: true,
  });
  LearningUnit.findOne = () => leanResult({
    unitId: tokenDocument.unitId,
    moduleId: tokenDocument.moduleId,
    title: "Academic Communication",
    isActive: true,
  });
  LearningPage.findOne = () => leanResult({
    pageId: tokenDocument.pageId,
    moduleId: tokenDocument.moduleId,
    unitId: tokenDocument.unitId,
    settingId: tokenDocument.settingId,
    title: "Meet a Foreign Lecturer",
    isActive: true,
  });
  try {
    const response = await request("POST", "/api/launch/resolve", {
      token: "valid-test-token",
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.launch.launch_source, "module_qr");
    assert.equal(response.body.launch.module_id, tokenDocument.moduleId);
    assert.equal(response.body.setting.setting_id, tokenDocument.settingId);
    assert.equal(tokenDocument.scanCount, 1);
  } finally {
    LaunchToken.findOne = originals.tokenFindOne;
    LearningModule.findOne = originals.moduleFindOne;
    LearningUnit.findOne = originals.unitFindOne;
    LearningPage.findOne = originals.pageFindOne;
  }
});
