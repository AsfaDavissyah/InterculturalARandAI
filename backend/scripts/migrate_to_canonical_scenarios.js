const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

if (require.main === module) {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
}

const Scenario = require("../models/Scenario");
const Topic = require("../models/Topic");
const Setting = require("../models/Setting");
const {
  APPROVED_AI_PARTNERS,
  generateDeterministicAdvancedSettings,
  buildRuntimeScenarioData,
  serializeCanonicalScenario,
} = require("../services/canonical_scenario_service");
const { topicsData, settingsData } = require("./seed_topics_and_settings");

const MONGODB_URI = process.env.MONGODB_URI;
// Product-approved legacy Library entries. Their content remains preserved for
// history, but they are hidden from new mobile sessions after migration.
const INACTIVE_LIBRARY_SCENARIO_IDS = new Set(["G-ICC-008", "G-ICC-009"]);

function normalizeString(val) {
  return String(val || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function checkSemanticDuplicate(itemA, itemB) {
  const titleMatch = normalizeString(itemA.title) === normalizeString(itemB.title);
  const locationMatch = normalizeString(itemA.practice_location || itemA.location) === normalizeString(itemB.practice_location || itemB.location);
  const roleMatch = normalizeString(itemA.student_role || itemA.studentRole) === normalizeString(itemB.student_role || itemB.studentRole);
  return (titleMatch && locationMatch) || (titleMatch && roleMatch);
}

async function runMigration({ dryRun = false } = {}) {
  console.log(`[Migration] Starting migration to canonical scenarios... Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);

  const manifest = {
    dryRun,
    timestamp: new Date().toISOString(),
    topicsMigrated: 0,
    scenariosMigratedFromLibrary: 0,
    scenariosMigratedFromSettings: 0,
    totalCanonicalScenarios: 0,
    duplicatesDetected: [],
    inactiveLibraryScenarioIds: Array.from(INACTIVE_LIBRARY_SCENARIO_IDS),
    errors: [],
  };

  const isDbConnected = mongoose.connection.readyState === 1;

  try {
    // 1. Migrate Topics to Categories
    const topics = isDbConnected ? await Topic.find().lean() : topicsData;
    for (const topic of topics) {
      manifest.topicsMigrated++;
      if (!dryRun && isDbConnected) {
        await Topic.updateOne(
          { topicId: topic.topicId },
          {
            $set: {
              status: topic.isActive !== false ? "active" : "archived",
              updatedAt: new Date(),
            },
          }
        );
      }
    }

    // 2. Fetch existing library scenarios
    const existingScenarios = isDbConnected ? await Scenario.find().lean() : [];
    const libraryScenarios = existingScenarios.filter((scenario) => {
      const placements = Array.isArray(scenario.placements)
        ? scenario.placements
        : [];
      const isGuidedOnly =
        scenario.legacyRefs?.experience_type === "guided_topic" &&
        !placements.includes("scenario_library");

      return !isGuidedOnly;
    });
    const libraryCanonicalList = [];
    const canonicalScenarioIds = new Set();

    for (const sc of libraryScenarios) {
      const legacyData = sc.data || {};
      const legacyScenario = legacyData.scenario || {};

      const title = sc.title || legacyScenario.title || "Untitled Scenario";
      const studentRole = sc.studentRole || legacyScenario.student_role || "Student";
      const studentTask = sc.studentTask || legacyScenario.task_instruction || "";
      const practiceLocation = sc.practiceLocation || legacyScenario.ar_scene || "Campus";
      const briefing = sc.briefing || legacyScenario.learning_goal || "";

      let aiPartner = sc.aiPartner || null;
      if (!aiPartner) {
        const aiRoleStr = legacyScenario.ai_role || "";
        const parts = aiRoleStr.split(",");
        const dispName = parts[0]?.trim() || "AI Partner";
        const role = parts[1]?.trim() || "Conversation Partner";
        const matched = APPROVED_AI_PARTNERS.find(
          (p) => normalizeString(p.display_name) === normalizeString(dispName) || normalizeString(p.role) === normalizeString(role)
        );
        aiPartner = matched || {
          profile_id: legacyScenario.avatar_key || "emma-lecturer",
          display_name: dispName,
          role: role,
          culture: legacyScenario.culture || "International",
          avatar_key: legacyScenario.avatar_key || "default_avatar",
          voice_profile: "female",
        };
      }

      const advanced = sc.advanced && Object.keys(sc.advanced).length > 0
        ? sc.advanced
        : generateDeterministicAdvancedSettings({
            title,
            briefing,
            student_role: studentRole,
            ai_partner: aiPartner,
            student_task: studentTask,
            practice_location: practiceLocation,
          });

      const forceInactive = INACTIVE_LIBRARY_SCENARIO_IDS.has(sc.scenarioId);
      const canonicalObj = {
        scenarioId: sc.scenarioId,
        title,
        briefing,
        placements: sc.placements && sc.placements.length > 0 ? sc.placements : ["scenario_library"],
        categoryIds: sc.categoryIds || [],
        status: forceInactive ? "inactive" : (sc.status || (sc.isActive !== false ? "published" : "inactive")),
        owner: sc.owner || { type: "admin", user_id: null, display_name: "System Admin" },
        studentRole,
        aiPartner,
        studentTask,
        practiceLocation,
        level: sc.level || legacyScenario.level || "B1",
        visual: sc.visual || { sticker_asset_key: legacyScenario.sticker_asset_key || "" },
        sessionRules: sc.sessionRules || {
          target_duration_minutes: 5,
          minimum_student_responses: 5,
          target_student_responses_min: 6,
          target_student_responses_max: 8,
          maximum_student_responses: 10,
        },
        advanced,
        version: sc.version || 1,
        isActive: forceInactive ? false : (sc.status ? sc.status === "published" : sc.isActive !== false),
        legacyRefs: sc.legacyRefs || {
          experience_type: "legacy_scenario",
          scenario_id: sc.scenarioId,
        },
        data: sc.data || buildRuntimeScenarioData({
          scenario_id: sc.scenarioId,
          title,
          briefing,
          student_role: studentRole,
          ai_partner: aiPartner,
          student_task: studentTask,
          practice_location: practiceLocation,
          session_rules: sc.sessionRules,
          advanced,
          version: sc.version || 1,
        }),
      };

      libraryCanonicalList.push(canonicalObj);
      canonicalScenarioIds.add(canonicalObj.scenarioId);
      manifest.scenariosMigratedFromLibrary++;

      if (!dryRun && isDbConnected) {
        await Scenario.updateOne(
          { scenarioId: canonicalObj.scenarioId },
          { $set: canonicalObj },
          { upsert: true }
        );
      }
    }

    // 3. Migrate Settings into canonical Scenarios
    const settings = isDbConnected ? await Setting.find().lean() : settingsData;
    for (const st of settings) {
      const settingId = st.settingId;
      const topicId = String(st.topicId).toLowerCase();

      // Check if this setting is already represented as a canonical scenario
      const existingByRef = isDbConnected
        ? await Scenario.findOne({ "legacyRefs.setting_id": settingId }).lean()
        : null;

      const title = st.title;
      const briefing = st.briefing || "";
      const studentRole = st.studentRole || "Student";
      const studentTask = st.taskInstruction || "";
      const practiceLocation = st.location || "Campus";
      const char = st.aiCharacter || {};

      const matchedPartner = APPROVED_AI_PARTNERS.find(
        (p) => normalizeString(p.display_name) === normalizeString(char.display_name) ||
               p.profile_id === char.avatar_key
      );

      const aiPartner = matchedPartner || {
        profile_id: char.avatar_key || "emma-lecturer",
        display_name: char.display_name || "AI Character",
        role: char.role || "Conversation Partner",
        culture: char.culture || "International",
        avatar_key: char.avatar_key || "default_avatar",
        voice_profile: "female",
      };

      const advanced = generateDeterministicAdvancedSettings({
        title,
        briefing,
        student_role: studentRole,
        ai_partner: aiPartner,
        student_task: studentTask,
        practice_location: practiceLocation,
      });

      // Check semantic duplicates with Library scenarios
      for (const libSc of libraryCanonicalList) {
        if (libSc.scenarioId !== settingId && checkSemanticDuplicate(libSc, st)) {
          manifest.duplicatesDetected.push({
            settingId: st.settingId,
            scenarioId: libSc.scenarioId,
            settingTitle: st.title,
            scenarioTitle: libSc.title,
            reason: "Title/Location/Role match",
          });
        }
      }

      const canonicalSettingObj = {
        scenarioId: existingByRef ? existingByRef.scenarioId : settingId,
        title,
        briefing,
        placements: ["guided_topics"],
        categoryIds: [topicId],
        status: st.isActive !== false ? "published" : "inactive",
        owner: { type: "admin", user_id: null, display_name: "System Admin" },
        studentRole,
        aiPartner,
        studentTask,
        practiceLocation,
        level: "B1",
        visual: { sticker_asset_key: st.stickerAssetKey || "" },
        sessionRules: {
          target_duration_minutes: 5,
          minimum_student_responses: st.sessionRules?.minimumStudentResponses || 5,
          target_student_responses_min: st.sessionRules?.targetStudentResponsesMin || 6,
          target_student_responses_max: st.sessionRules?.targetStudentResponsesMax || 8,
          maximum_student_responses: st.sessionRules?.maximumStudentResponses || 10,
        },
        advanced,
        version: st.version || 1,
        isActive: st.isActive !== false,
        legacyRefs: {
          experience_type: "guided_topic",
          topic_id: topicId,
          setting_id: settingId,
        },
        data: buildRuntimeScenarioData({
          scenario_id: settingId,
          title,
          briefing,
          category_ids: [topicId],
          student_role: studentRole,
          ai_partner: aiPartner,
          student_task: studentTask,
          practice_location: practiceLocation,
          session_rules: st.sessionRules,
          advanced,
          version: st.version || 1,
        }),
      };

      manifest.scenariosMigratedFromSettings++;
      canonicalScenarioIds.add(canonicalSettingObj.scenarioId);

      if (!dryRun && isDbConnected) {
        await Scenario.updateOne(
          { scenarioId: canonicalSettingObj.scenarioId },
          { $set: canonicalSettingObj },
          { upsert: true }
        );
      }
    }

    manifest.totalCanonicalScenarios = canonicalScenarioIds.size;

    console.log("[Migration] Migration completed successfully.");
    console.log("[Migration Manifest]:", JSON.stringify(manifest, null, 2));
    return manifest;
  } catch (err) {
    console.error("[Migration] Error running migration:", err);
    manifest.errors.push(err.message);
    throw err;
  }
}

if (require.main === module) {
  const dryRun = process.argv.includes("--dry-run");
  if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI).then(() => {
      runMigration({ dryRun }).finally(() => mongoose.disconnect());
    });
  } else {
    runMigration({ dryRun });
  }
}

module.exports = {
  runMigration,
};
