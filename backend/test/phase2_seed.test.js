const assert = require("node:assert/strict");
const test = require("node:test");

const {
  seedTopicsAndSettings,
  topicsData,
  settingsData,
} = require("../scripts/seed_topics_and_settings");
const Topic = require("../models/Topic");
const Setting = require("../models/Setting");

test("Phase 2 seed data defines three topics and six active settings", () => {
  assert.equal(topicsData.length, 3);
  assert.equal(settingsData.length, 6);

  const topicIds = new Set(topicsData.map((t) => t.topicId));
  assert.ok(topicIds.has("academic-communication"));
  assert.ok(topicIds.has("social-communication"));
  assert.ok(topicIds.has("professional-communication"));

  for (const topic of topicsData) {
    assert.equal(topic.isActive, true);
    assert.ok(topic.languageObjectives.length >= 5);
    assert.ok(topic.iccObjectives.length >= 5);
  }

  for (const setting of settingsData) {
    assert.equal(setting.isActive, true);
    assert.ok(topicIds.has(setting.topicId));
    assert.ok(setting.settingId);
    assert.ok(setting.location);
    assert.ok(setting.studentRole);
    assert.ok(setting.aiCharacter.display_name);
    assert.ok(setting.aiCharacter.role);
    assert.ok(setting.aiCharacter.avatar_key);
    assert.ok(setting.stickerAssetKey);
    assert.ok(setting.sessionRules.minimumStudentResponses >= 5);
  }
});

test("Topic and Setting seed data passes Mongoose schema validation", async () => {
  for (const topicData of topicsData) {
    const topic = new Topic(topicData);
    await topic.validate();
  }

  for (const settingData of settingsData) {
    const setting = new Setting(settingData);
    await setting.validate();
  }
});

test("Each setting matches expected AI characters and visual sticker keys", () => {
  const academicOffice = settingsData.find((s) => s.settingId === "ACADEMIC-LECTURER-OFFICE");
  const academicClass = settingsData.find((s) => s.settingId === "ACADEMIC-AFTER-CLASS");
  const londonRestaurant = settingsData.find((s) => s.settingId === "SOCIAL-LONDON-RESTAURANT");
  const melbourneCafe = settingsData.find((s) => s.settingId === "SOCIAL-MELBOURNE-CAFE");
  const interviewRoom = settingsData.find((s) => s.settingId === "PROFESSIONAL-INTERVIEW-ROOM");
  const careerFair = settingsData.find((s) => s.settingId === "PROFESSIONAL-CAREER-FAIR");

  assert.equal(academicOffice.aiCharacter.display_name, "Dr Emma Collins");
  assert.equal(academicClass.aiCharacter.display_name, "Dr Emma Collins");
  assert.equal(londonRestaurant.aiCharacter.display_name, "Sarah Bennett");
  assert.equal(melbourneCafe.aiCharacter.display_name, "Olivia Reed");
  assert.equal(interviewRoom.aiCharacter.display_name, "Michael Harris");
  assert.equal(careerFair.aiCharacter.display_name, "Michael Harris");

  assert.equal(academicOffice.stickerAssetKey, "sticker_lecturer_office");
  assert.equal(londonRestaurant.stickerAssetKey, "sticker_london_restaurant");
  assert.equal(interviewRoom.stickerAssetKey, "sticker_interview_room");
});

test("seeding twice is idempotent and preserves dashboard CRUD changes", async () => {
  class InMemoryModel {
    constructor(key) {
      this.key = key;
      this.records = new Map();
    }

    async updateOne(filter, update, options) {
      assert.equal(options.upsert, true);
      assert.equal(options.runValidators, true);
      assert.ok(update.$setOnInsert);
      assert.equal(update.$set, undefined);

      const id = filter[this.key];
      if (this.records.has(id)) {
        return { matchedCount: 1, upsertedCount: 0 };
      }

      this.records.set(id, structuredClone(update.$setOnInsert));
      return { matchedCount: 0, upsertedCount: 1 };
    }
  }

  const topicModel = new InMemoryModel("topicId");
  const settingModel = new InMemoryModel("settingId");
  const silentLogger = { log() {} };

  const firstRun = await seedTopicsAndSettings({
    TopicModel: topicModel,
    SettingModel: settingModel,
    logger: silentLogger,
  });
  assert.equal(firstRun.topicsInserted, 3);
  assert.equal(firstRun.settingsInserted, 6);

  topicModel.records.get("academic-communication").title =
    "Academic Communication Edited by Admin";
  settingModel.records.get("ACADEMIC-LECTURER-OFFICE").briefing =
    "Briefing edited through dashboard CRUD";

  const secondRun = await seedTopicsAndSettings({
    TopicModel: topicModel,
    SettingModel: settingModel,
    logger: silentLogger,
  });

  assert.equal(secondRun.topicsInserted, 0);
  assert.equal(secondRun.settingsInserted, 0);
  assert.equal(topicModel.records.size, 3);
  assert.equal(settingModel.records.size, 6);
  assert.equal(
    topicModel.records.get("academic-communication").title,
    "Academic Communication Edited by Admin"
  );
  assert.equal(
    settingModel.records.get("ACADEMIC-LECTURER-OFFICE").briefing,
    "Briefing edited through dashboard CRUD"
  );
});
