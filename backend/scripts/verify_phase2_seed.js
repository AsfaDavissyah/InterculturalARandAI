const assert = require("node:assert/strict");
const path = require("node:path");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Topic = require("../models/Topic");
const Setting = require("../models/Setting");
const {
  seedTopicsAndSettings,
  topicsData,
  settingsData,
} = require("./seed_topics_and_settings");

function canonicalize(documents, idField) {
  return documents
    .map((document) => JSON.parse(JSON.stringify(document)))
    .sort((left, right) =>
      String(left[idField]).localeCompare(String(right[idField]))
    );
}

async function readSeededRecords() {
  const topicIds = topicsData.map((topic) => topic.topicId);
  const settingIds = settingsData.map((setting) => setting.settingId);
  const [topics, settings] = await Promise.all([
    Topic.find({ topicId: { $in: topicIds } }).lean(),
    Setting.find({ settingId: { $in: settingIds } }).lean(),
  ]);

  return {
    topics: canonicalize(topics, "topicId"),
    settings: canonicalize(settings, "settingId"),
  };
}

async function verifyPhase2Seed() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required in backend/.env");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  try {
    const firstResult = await seedTopicsAndSettings();
    const firstSnapshot = await readSeededRecords();
    assert.equal(firstSnapshot.topics.length, topicsData.length);
    assert.equal(firstSnapshot.settings.length, settingsData.length);

    const secondResult = await seedTopicsAndSettings();
    const secondSnapshot = await readSeededRecords();

    assert.deepEqual(
      secondSnapshot,
      firstSnapshot,
      "Second seed run changed records that may have been edited through CRUD"
    );
    assert.equal(secondResult.topicsInserted, 0);
    assert.equal(secondResult.settingsInserted, 0);

    console.log("Phase 2 database verification passed.");
    console.log(`Topics: ${secondSnapshot.topics.length}`);
    console.log(`Settings: ${secondSnapshot.settings.length}`);
    console.log(
      `First run inserted: ${firstResult.topicsInserted} topics, ${firstResult.settingsInserted} settings`
    );
    console.log("Second run inserted: 0 topics, 0 settings");
    console.log("CRUD-safe snapshot comparison: unchanged");
  } finally {
    await mongoose.disconnect();
  }
}

verifyPhase2Seed().catch((error) => {
  console.error(`Phase 2 database verification failed: ${error.message}`);
  process.exitCode = 1;
});
