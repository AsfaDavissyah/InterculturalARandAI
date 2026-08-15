const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const {
  app,
  validateSecurityConfig,
  buildLecturerOwnershipFilter,
  combineSessionFilters,
} = require("../server");
const User = require("../models/User");
const execFileAsync = promisify(execFile);

test("validateSecurityConfig enforces strict production security rules", () => {
  // Missing JWT_SECRET in production throws error
  assert.throws(
    () => {
      validateSecurityConfig({
        nodeEnv: "production",
        jwtSecret: "",
        corsOrigin: "https://intercultural-ar-and-ai.vercel.app",
      });
    },
    {
      message: /\[Security\] JWT_SECRET must be defined and at least 32 characters in production mode\./,
    }
  );

  // JWT_SECRET shorter than 32 chars in production throws error
  assert.throws(
    () => {
      validateSecurityConfig({
        nodeEnv: "production",
        jwtSecret: "too_short_secret_key",
        corsOrigin: "https://intercultural-ar-and-ai.vercel.app",
      });
    },
    {
      message: /\[Security\] JWT_SECRET must be defined and at least 32 characters in production mode\./,
    }
  );

  // Missing CORS_ORIGIN in production throws error
  assert.throws(
    () => {
      validateSecurityConfig({
        nodeEnv: "production",
        jwtSecret: "a_very_secure_random_jwt_secret_with_more_than_32_characters!",
        corsOrigin: "",
      });
    },
    {
      message: /\[Security\] CORS_ORIGIN must be configured with approved origin\(s\) in production mode\./,
    }
  );

  // Valid production configuration passes
  const prodConfig = validateSecurityConfig({
    nodeEnv: "production",
    jwtSecret: "a_very_secure_random_jwt_secret_with_more_than_32_characters!",
    corsOrigin: "https://intercultural-ar-and-ai.vercel.app, https://custom-domain.com",
  });

  assert.equal(prodConfig.isProduction, true);
  assert.equal(prodConfig.jwtSecret, "a_very_secure_random_jwt_secret_with_more_than_32_characters!");
  assert.deepEqual(prodConfig.allowedOrigins, [
    "https://intercultural-ar-and-ai.vercel.app",
    "https://custom-domain.com",
  ]);
});

test("validateSecurityConfig allows development fallback", () => {
  const devConfig = validateSecurityConfig({
    nodeEnv: "development",
    jwtSecret: "",
    corsOrigin: "",
  });

  assert.equal(devConfig.isProduction, false);
  assert.ok(devConfig.jwtSecret.length >= 32);
  assert.deepEqual(devConfig.allowedOrigins, []);
});

test("production app CORS allows approved and non-browser requests, then rejects other origins", async () => {
  const probePath = path.join(__dirname, "..", "support", "production_cors_probe.js");
  const { stdout } = await execFileAsync(process.execPath, [probePath], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      JWT_SECRET: "phase9_test_jwt_secret_that_is_longer_than_32_characters",
      CORS_ORIGIN: "https://intercultural-ar-and-ai.vercel.app",
      USE_OPENAI: "false",
    },
  });
  assert.match(stdout, /PRODUCTION_CORS_PROBE_OK/);
});

test("lecturer ownership filters cannot include another lecturer's students", () => {
  const lecturerScope = {
    isAdmin: false,
    students: [
      { _id: "507f1f77bcf86cd799439012", studentId: "STU-001" },
    ],
  };
  const ownership = buildLecturerOwnershipFilter(lecturerScope);
  assert.deepEqual(ownership, {
    $or: [
      { userId: { $in: ["507f1f77bcf86cd799439012"] } },
      { "student.student_id": { $in: ["STU-001"] } },
    ],
  });

  const combined = combineSessionFilters(ownership, { status: "completed" });
  assert.deepEqual(combined, {
    $and: [ownership, { status: "completed" }],
  });
});

test("administrator queries remain unscoped unless an explicit consent roster is supplied", () => {
  assert.equal(buildLecturerOwnershipFilter({ isAdmin: true, students: [] }), null);
  assert.deepEqual(combineSessionFilters(null, { status: "completed" }), {
    status: "completed",
  });
});

test("Admin bootstrap handles enabled/disabled switches and skips when admin exists", async () => {
  const originalFindOne = User.findOne;

  try {
    // 1. When admin already exists
    User.findOne = async () => ({ _id: "admin_1", role: "admin" });
    const { bootstrapAdmin } = require("../server");
    const resAlready = await bootstrapAdmin();
    assert.equal(resAlready.bootstrapped, false);
    assert.equal(resAlready.reason, "already_exists");

    // 2. When bootstrap is disabled
    User.findOne = async () => null;
    process.env.ADMIN_BOOTSTRAP_ENABLED = "false";
    const resDisabled = await bootstrapAdmin();
    assert.equal(resDisabled.bootstrapped, false);
    assert.equal(resDisabled.reason, "disabled");

    // 3. When bootstrap is enabled but credentials missing
    process.env.ADMIN_BOOTSTRAP_ENABLED = "true";
    delete process.env.ADMIN_BOOTSTRAP_EMAIL;
    delete process.env.ADMIN_BOOTSTRAP_PASSWORD;
    const resInvalid = await bootstrapAdmin();
    assert.equal(resInvalid.bootstrapped, false);
    assert.equal(resInvalid.reason, "invalid_credentials");
  } finally {
    User.findOne = originalFindOne;
    delete process.env.ADMIN_BOOTSTRAP_ENABLED;
    delete process.env.ADMIN_BOOTSTRAP_EMAIL;
    delete process.env.ADMIN_BOOTSTRAP_PASSWORD;
  }
});
