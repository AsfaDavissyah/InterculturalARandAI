const assert = require("node:assert/strict");
const test = require("node:test");

const { migrateLecturerCode } = require("../services/lecturer_code_service");

test("regenerating a lecturer code preserves linked students", async () => {
  const updates = [];
  const UserModel = {
    updateMany: async (filter, update) => {
      updates.push({ filter, update });
      return { modifiedCount: 3 };
    },
  };
  const lecturer = {
    lecturerCode: "DR-OLD-0001",
    save: async () => {},
  };

  const result = await migrateLecturerCode({
    UserModel,
    lecturer,
    nextCode: "DR-NEW-0002",
  });

  assert.equal(lecturer.lecturerCode, "DR-NEW-0002");
  assert.equal(result.migratedStudents, 3);
  assert.deepEqual(updates[0], {
    filter: { role: "student", studentLecturerCode: "DR-OLD-0001" },
    update: { $set: { studentLecturerCode: "DR-NEW-0002" } },
  });
});

test("student links roll back when saving the lecturer fails", async () => {
  const updates = [];
  const UserModel = {
    updateMany: async (filter, update) => {
      updates.push({ filter, update });
      return { modifiedCount: 2 };
    },
  };
  const lecturer = {
    lecturerCode: "DR-OLD-0001",
    save: async () => {
      throw new Error("save failed");
    },
  };

  await assert.rejects(
    migrateLecturerCode({ UserModel, lecturer, nextCode: "DR-NEW-0002" }),
    /save failed/
  );
  assert.equal(lecturer.lecturerCode, "DR-OLD-0001");
  assert.equal(updates.length, 2);
  assert.deepEqual(updates[1], {
    filter: { role: "student", studentLecturerCode: "DR-NEW-0002" },
    update: { $set: { studentLecturerCode: "DR-OLD-0001" } },
  });
});
