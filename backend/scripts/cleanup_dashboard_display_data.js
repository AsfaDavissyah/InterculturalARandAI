require("dotenv").config();
const mongoose = require("mongoose");
const Scenario = require("../models/Scenario");
const Setting = require("../models/Setting");
const PracticeSession = require("../models/PracticeSession");
const Topic = require("../models/Topic");

const applyChanges = process.argv.includes("--apply");

const targets = [
  {
    name: "scenarios",
    model: Scenario,
    fields: ["title", "briefing", "studentRole", "studentTask", "practiceLocation", "advanced", "data"],
  },
  {
    name: "settings",
    model: Setting,
    fields: ["title", "location", "briefing", "studentRole", "taskInstruction", "conversationStages", "constraints", "rubric"],
  },
  {
    name: "practice_sessions",
    model: PracticeSession,
    fields: ["scenario", "topicTitle", "settingTitle"],
  },
  {
    name: "topics",
    model: Topic,
    fields: ["title", "description", "languageObjectives", "iccObjectives"],
  },
];

function cleanValue(value, path, changedPaths) {
  if (typeof value === "string") {
    const cleaned = value.replace(/\bcampuss\b/gi, "Campus");
    if (cleaned !== value) changedPaths.push(path);
    return cleaned;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => cleanValue(item, `${path}.${index}`, changedPaths));
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        cleanValue(item, path ? `${path}.${key}` : key, changedPaths),
      ])
    );
  }

  return value;
}

async function cleanCollection({ name, model, fields }) {
  const documents = await model.find({}).select(fields.join(" ")).lean();
  let matchedDocuments = 0;
  let changedFields = 0;

  for (const document of documents) {
    const updates = {};
    const paths = [];

    for (const field of fields) {
      if (document[field] === undefined) continue;
      const fieldPaths = [];
      const cleaned = cleanValue(document[field], field, fieldPaths);
      if (fieldPaths.length > 0) {
        updates[field] = cleaned;
        paths.push(...fieldPaths);
      }
    }

    if (paths.length === 0) continue;
    matchedDocuments += 1;
    changedFields += paths.length;
    console.log(`${applyChanges ? "UPDATE" : "FOUND"} ${name} ${document._id}: ${paths.join(", ")}`);

    if (applyChanges) {
      await model.collection.updateOne({ _id: document._id }, { $set: updates });
    }
  }

  return { name, scanned: documents.length, matchedDocuments, changedFields };
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const summaries = [];
  for (const target of targets) {
    summaries.push(await cleanCollection(target));
  }

  console.table(summaries);
  console.log(applyChanges ? "Dashboard display data cleanup applied." : "Dry run only. Re-run with --apply to update matched records.");
}

main()
  .catch((error) => {
    console.error(`Dashboard display data cleanup failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
