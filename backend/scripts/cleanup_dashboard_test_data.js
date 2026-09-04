const path = require("path");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Scenario = require("../models/Scenario");

const TEST_SCENARIO_IDS = [
  "SCN-2026-0017", "SCN-2026-0018", "SCN-2026-0019", "SCN-2026-0020",
  "SCN-2026-0021", "SCN-2026-0022", "SCN-2026-0023", "SCN-2026-0024",
];
const TEST_TITLES = [
  "Academic Office Consultation Test",
  "Copy of Academic Office Consultation Test",
];

async function cleanup({ apply = false } = {}) {
  await mongoose.connect(process.env.MONGODB_URI);
  const filter = {
    scenarioId: { $in: TEST_SCENARIO_IDS },
    title: { $in: TEST_TITLES },
  };
  const records = await Scenario.find(filter).select("scenarioId title").sort({ scenarioId: 1 }).lean();
  let removed = 0;
  if (apply && records.length > 0) {
    removed = (await Scenario.deleteMany(filter)).deletedCount;
  }
  await mongoose.disconnect();
  return { mode: apply ? "apply" : "dry-run", matched: records.length, removed, records };
}

if (require.main === module) {
  cleanup({ apply: process.argv.includes("--apply") })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = { cleanup, TEST_SCENARIO_IDS, TEST_TITLES };
