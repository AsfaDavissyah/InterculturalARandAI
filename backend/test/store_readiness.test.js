const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const AIResponseReport = require("../models/AIResponseReport");
const AccountDeletionRequest = require("../models/AccountDeletionRequest");
const {
  AccountDeletionError,
  deleteStudentAccount,
} = require("../services/account_deletion_service");

function createDeletionModels({ role = "student", passwordMatches = true } = {}) {
  const calls = [];
  const user = {
    _id: "507f1f77bcf86cd799439011",
    role,
    comparePassword: async () => passwordMatches,
  };
  return {
    calls,
    User: {
      findById: async () => user,
      deleteOne: async (filter, options) => {
        calls.push(["user", filter, options]);
        return { deletedCount: 1 };
      },
    },
    PracticeSession: {
      deleteMany: async (filter, options) => {
        calls.push(["sessions", filter, options]);
        return { deletedCount: 3 };
      },
    },
    AIResponseReport: {
      deleteMany: async (filter, options) => {
        calls.push(["reports", filter, options]);
        return { deletedCount: 2 };
      },
    },
    runTransaction: async (work) => work({ id: "transaction" }),
  };
}

test("student deletion removes dependent practice and report data in one transaction", async () => {
  const models = createDeletionModels();
  const result = await deleteStudentAccount({
    userId: "507f1f77bcf86cd799439011",
    password: "correct-password",
    ...models,
  });
  assert.deepEqual(result, { deletedSessions: 3, deletedReports: 2 });
  assert.deepEqual(models.calls.map((call) => call[0]).sort(), ["reports", "sessions", "user"]);
  assert.ok(models.calls.every((call) => call[2].session.id === "transaction"));
});

test("student deletion rejects a wrong password and admin-managed roles", async () => {
  await assert.rejects(
    deleteStudentAccount({
      userId: "507f1f77bcf86cd799439011",
      password: "wrong",
      ...createDeletionModels({ passwordMatches: false }),
    }),
    (error) => error instanceof AccountDeletionError && error.code === "INVALID_PASSWORD"
  );
  await assert.rejects(
    deleteStudentAccount({
      userId: "507f1f77bcf86cd799439011",
      password: "correct-password",
      ...createDeletionModels({ role: "lecturer" }),
    }),
    (error) => error instanceof AccountDeletionError && error.code === "ADMIN_MANAGED_ACCOUNT"
  );
});

test("AI response report validates categories and prevents oversized content", async () => {
  const valid = new AIResponseReport({
    userId: "507f1f77bcf86cd799439011",
    sessionId: "session_store_test",
    scenarioId: "G-ICC-008",
    turnNumber: 2,
    responseText: "A complete response.",
    category: "incomplete",
  });
  await valid.validate();

  const invalid = new AIResponseReport({
    userId: "507f1f77bcf86cd799439011",
    sessionId: "session_store_test",
    turnNumber: 0,
    responseText: "x".repeat(3001),
    category: "not-a-category",
  });
  const error = await invalid.validate().catch((validationError) => validationError);
  assert.ok(error.errors.turnNumber);
  assert.ok(error.errors.responseText);
  assert.ok(error.errors.category);
});

test("public deletion requests validate required identity fields", async () => {
  const valid = new AccountDeletionRequest({ email: "student@example.com", studentId: "23001" });
  await valid.validate();
  const invalid = new AccountDeletionRequest({ notes: "missing email" });
  const error = await invalid.validate().catch((validationError) => validationError);
  assert.ok(error.errors.email);
});

test("public store policy and deletion pages are present", () => {
  const publicDir = path.join(__dirname, "..", "public");
  for (const file of ["privacy.html", "terms.html", "ai-notice.html", "support.html", "account-deletion.html"]) {
    assert.equal(fs.existsSync(path.join(publicDir, file)), true, `${file} should exist`);
  }
});
