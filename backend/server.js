require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const QRCode = require("qrcode");

const User = require("./models/User");
const PracticeSession = require("./models/PracticeSession");
const Scenario = require("./models/Scenario");
const Topic = require("./models/Topic");
const Setting = require("./models/Setting");
const LearningModule = require("./models/LearningModule");
const LearningUnit = require("./models/LearningUnit");
const LearningPage = require("./models/LearningPage");
const LaunchToken = require("./models/LaunchToken");
const {
  seedTopicsAndSettings,
  topicsData,
  settingsData,
} = require("./scripts/seed_topics_and_settings");
const {
  buildGuidedScenarioData,
  serializeSetting,
  serializeTopic,
} = require("./services/guided_scenario_service");

const MONGODB_URI = process.env.MONGODB_URI;

function validateSecurityConfig({
  nodeEnv = process.env.NODE_ENV || "development",
  jwtSecret = process.env.JWT_SECRET,
  corsOrigin = process.env.CORS_ORIGIN,
} = {}) {
  const isProd = nodeEnv === "production";

  if (isProd) {
    if (!jwtSecret || typeof jwtSecret !== "string" || jwtSecret.trim().length < 32) {
      throw new Error(
        "[Security] JWT_SECRET must be defined and at least 32 characters in production mode."
      );
    }
    const origins = (corsOrigin || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    if (origins.length === 0) {
      throw new Error(
        "[Security] CORS_ORIGIN must be configured with approved origin(s) in production mode."
      );
    }
    return {
      isValid: true,
      jwtSecret: jwtSecret.trim(),
      allowedOrigins: origins,
      isProduction: true,
    };
  }

  const fallbackSecret =
    jwtSecret && typeof jwtSecret === "string" && jwtSecret.trim().length > 0
      ? jwtSecret.trim()
      : "intercultural_ai_dev_secret_key_2026_at_least_32_bytes";
  const origins = (corsOrigin || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    isValid: true,
    jwtSecret: fallbackSecret,
    allowedOrigins: origins,
    isProduction: false,
  };
}

const securityConfig = validateSecurityConfig({
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET,
  corsOrigin: process.env.CORS_ORIGIN,
});

const JWT_SECRET = securityConfig.jwtSecret;

async function bootstrapAdmin() {
  try {
    const adminExists = await User.findOne({ role: "admin" });
    if (adminExists) {
      console.log("[Bootstrap] Admin account already exists. Skipping bootstrap.");
      return { bootstrapped: false, reason: "already_exists" };
    }

    const isEnabled = process.env.ADMIN_BOOTSTRAP_ENABLED === "true";
    if (!isEnabled) {
      console.log("[Bootstrap] Admin bootstrap is disabled (ADMIN_BOOTSTRAP_ENABLED !== 'true'). No default admin created.");
      return { bootstrapped: false, reason: "disabled" };
    }

    const email = (process.env.ADMIN_BOOTSTRAP_EMAIL || "").trim().toLowerCase();
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || "";
    const name = (process.env.ADMIN_BOOTSTRAP_NAME || "System Admin").trim();

    if (!email || !password || password.length < 8) {
      console.warn("[Bootstrap] ADMIN_BOOTSTRAP_EMAIL or ADMIN_BOOTSTRAP_PASSWORD is missing or password < 8 chars. Skipping bootstrap.");
      return { bootstrapped: false, reason: "invalid_credentials" };
    }

    const admin = new User({
      name,
      email,
      password,
      gender: "male",
      role: "admin",
    });
    await admin.save();
    console.log(`[Bootstrap] Admin account bootstrapped successfully for: ${email}`);
    return { bootstrapped: true, email };
  } catch (err) {
    console.error("[Bootstrap] Error bootstrapping admin account:", err.message);
    return { bootstrapped: false, error: err.message };
  }
}

async function seedScenarios() {
  try {
    const count = await Scenario.countDocuments();
    if (count > 0) {
      console.log("Scenarios already exist in database. Skipping seed.");
      return;
    }
    console.log("Database scenarios collection is empty. Seeding from files...");
    const scenarios = loadScenarios(dataDir);
    const scenariosToInsert = [];
    for (const [key, data] of scenarios.entries()) {
      scenariosToInsert.push({
        scenarioId: data.scenario.scenario_id,
        title: data.scenario.title,
        version: Number(data.scenario.scenario_version || data.scenario.version || data.version || 1),
        isActive: true,
        data: data,
      });
    }
    if (scenariosToInsert.length > 0) {
      await Scenario.insertMany(scenariosToInsert);
      console.log(`Seeded ${scenariosToInsert.length} scenarios successfully.`);
    }
  } catch (err) {
    console.error("Error seeding scenarios:", err);
  }
}

async function connectDatabase() {
  if (!MONGODB_URI) {
    console.log("MONGODB_URI is not defined in .env. Database operations will be disabled.");
    return;
  }

  if (mongoose.connection.readyState !== 0) return;

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB Atlas successfully.");
    await bootstrapAdmin();
    await seedScenarios();
    await seedTopicsAndSettings();
  } catch (err) {
    console.error("MongoDB Atlas connection error:", err);
  }
}

let evaluateWithOpenAI = null;
let generateChatResponseWithOpenAI = null;

try {
  const openAIService = require("./services/openai_service");
  evaluateWithOpenAI = openAIService.evaluateWithOpenAI;
  generateChatResponseWithOpenAI = openAIService.generateChatResponseWithOpenAI;
} catch (error) {
  console.log("OpenAI service not loaded. Backend will use rule-based evaluator.");
}

let generateTTS = null;
try {
  const ttsService = require("./services/tts_service");
  generateTTS = ttsService.generateTTS;
} catch (error) {
  console.log("TTS service not loaded. Text-to-speech endpoint will be disabled.");
}

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (!isProduction) {
        return callback(null, true);
      }
      if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  const startedAt = Date.now();
  const requestId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  req.requestId = requestId;

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const userId = req.user?.userId || "anonymous";
    const scenarioId = req.body?.scenario_id || req.params?.scenario_id || "-";

    console.log(
      `[HTTP] request_id=${requestId} method=${req.method} path=${req.originalUrl} status=${res.statusCode} duration_ms=${durationMs} user_id=${userId} scenario_id=${scenarioId}`
    );
  });

  if (!isProduction) {
    const logBody = { ...req.body };
    if (logBody.password) {
      logBody.password = "[REDACTED]";
    }
    if (logBody.conversation_history) {
      logBody.conversation_history = `[${logBody.conversation_history.length} messages]`;
    }
    if (logBody.transcript) {
      logBody.transcript = `[${logBody.transcript.length} messages]`;
    }
    if (logBody.evaluations) {
      logBody.evaluations = `[${logBody.evaluations.length} evaluations]`;
    }
    console.log(`[HTTP:debug] request_id=${requestId} body=${JSON.stringify(logBody)}`);
  }
  next();
});
app.use((err, req, res, next) => {
  if (err?.message === "Not allowed by CORS") {
    return res.status(403).json({
      error: "CORS origin is not allowed",
      request_id: req.requestId,
    });
  }
  next(err);
});

const dataDir = path.join(__dirname, "data");
const defaultScenarioId = "G-ICC-008";
const scenarioMap = loadScenarios(dataDir);

async function findActiveTopic(topicId) {
  const normalizedId = String(topicId || "").trim().toLowerCase();
  if (!normalizedId) return null;
  if (mongoose.connection.readyState === 1) {
    return Topic.findOne({ topicId: normalizedId, isActive: true }).lean();
  }
  return topicsData.find(
    (topic) => topic.topicId === normalizedId && topic.isActive !== false
  ) || null;
}

async function findTopicById(topicId) {
  const normalizedId = String(topicId || "").trim().toLowerCase();
  if (!normalizedId) return null;
  if (mongoose.connection.readyState === 1) {
    return Topic.findOne({ topicId: normalizedId });
  }
  return topicsData.find((topic) => topic.topicId === normalizedId) || null;
}

function validateTopicInput({ topicId, title }, { requireId = true } = {}) {
  const normalizedId = String(topicId || "").trim().toLowerCase();
  if (requireId && !normalizedId) return "topicId is required";
  if (normalizedId && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedId)) {
    return "topicId must use lowercase letters, numbers, and single hyphens";
  }
  if (title !== undefined && !String(title).trim()) return "title cannot be empty";
  return null;
}

function normalizeSessionRulesInput(sessionRules = {}) {
  return {
    minimumStudentResponses: Number(sessionRules.minimumStudentResponses ?? 5),
    targetStudentResponsesMin: Number(sessionRules.targetStudentResponsesMin ?? 6),
    targetStudentResponsesMax: Number(sessionRules.targetStudentResponsesMax ?? 8),
    maximumStudentResponses: Number(sessionRules.maximumStudentResponses ?? 10),
  };
}

function validateSessionRulesInput(sessionRules = {}) {
  const rules = normalizeSessionRulesInput(sessionRules);
  const values = Object.values(rules);
  if (!values.every((value) => Number.isInteger(value) && value > 0)) {
    return "Session response limits must be positive integers";
  }
  if (
    rules.minimumStudentResponses > rules.targetStudentResponsesMin ||
    rules.targetStudentResponsesMin > rules.targetStudentResponsesMax ||
    rules.targetStudentResponsesMax > rules.maximumStudentResponses
  ) {
    return "Invalid session response count range (minimum <= targetMin <= targetMax <= maximum)";
  }
  if (rules.maximumStudentResponses > 20) {
    return "maximumStudentResponses cannot exceed 20";
  }
  return null;
}

function validateSettingInput(payload, { requireIdentity = true } = {}) {
  const requiredFields = ["settingId", "topicId", "title", "location", "studentRole"];
  if (requireIdentity) {
    const missing = requiredFields.find((field) => !String(payload[field] || "").trim());
    if (missing) return `${missing} is required`;
    if (!payload.aiCharacter) return "aiCharacter is required";
  }

  const settingId = String(payload.settingId || "").trim().toUpperCase();
  if (settingId && !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(settingId)) {
    return "settingId must use uppercase letters, numbers, and single hyphens";
  }
  if (payload.title !== undefined && !String(payload.title).trim()) return "title cannot be empty";
  if (payload.location !== undefined && !String(payload.location).trim()) return "location cannot be empty";
  if (payload.studentRole !== undefined && !String(payload.studentRole).trim()) return "studentRole cannot be empty";
  if (payload.aiCharacter !== undefined) {
    if (!String(payload.aiCharacter?.display_name || payload.aiCharacter?.displayName || "").trim()) {
      return "aiCharacter.display_name is required";
    }
    if (!String(payload.aiCharacter?.role || "").trim()) {
      return "aiCharacter.role is required";
    }
  }
  if (payload.conversationStages !== undefined && !Array.isArray(payload.conversationStages)) {
    return "conversationStages must be an array";
  }
  if (payload.constraints !== undefined && !Array.isArray(payload.constraints)) {
    return "constraints must be an array";
  }
  if (payload.rubric !== undefined && (payload.rubric === null || Array.isArray(payload.rubric) || typeof payload.rubric !== "object")) {
    return "rubric must be an object";
  }
  return payload.sessionRules ? validateSessionRulesInput(payload.sessionRules) : null;
}

async function findActiveSetting(settingId) {
  const normalizedId = String(settingId || "").trim().toUpperCase();
  if (!normalizedId) return null;
  if (mongoose.connection.readyState === 1) {
    return Setting.findOne({ settingId: normalizedId, isActive: true }).lean();
  }
  return settingsData.find(
    (setting) => setting.settingId === normalizedId && setting.isActive !== false
  ) || null;
}

async function resolveConversationScenario({ scenarioId, topicId, settingId }) {
  const requestedSettingId = String(settingId || scenarioId || "")
    .trim()
    .toUpperCase();
  const guidedSetting = await findActiveSetting(requestedSettingId);

  if (guidedSetting) {
    const guidedTopic = await findActiveTopic(guidedSetting.topicId);
    if (!guidedTopic) {
      return { error: `Topic ${guidedSetting.topicId} is not supported or active.`, status: 400 };
    }
    if (
      topicId &&
      String(topicId).trim().toLowerCase() !== guidedSetting.topicId
    ) {
      return {
        error: `Setting ${guidedSetting.settingId} does not belong to topic ${topicId}.`,
        status: 400,
      };
    }
    return {
      scenarioData: buildGuidedScenarioData(guidedSetting, guidedTopic),
    };
  }

  const normalizedScenarioId = String(scenarioId || "").trim().toUpperCase();
  if (!normalizedScenarioId) {
    return { error: "scenario_id or setting_id is required.", status: 400 };
  }

  if (mongoose.connection.readyState === 1) {
    const scenarioDoc = await Scenario.findOne({
      scenarioId: normalizedScenarioId,
      isActive: true,
    });
    if (scenarioDoc) {
      const version = Number(
        scenarioDoc.version || scenarioDoc.data?.scenario?.scenario_version || 1
      );
      return { scenarioData: attachScenarioVersion(scenarioDoc.data, version) };
    }
  } else {
    const fallback = scenarioMap.get(normalizedScenarioId);
    if (fallback) {
      return { scenarioData: attachScenarioVersion(fallback, 1) };
    }
  }

  return {
    error: `Scenario or setting ${normalizedScenarioId} is not supported or active.`,
    status: 400,
  };
}

function getExperienceMetadata(scenarioData) {
  return {
    experience_type: scenarioData.experience_type || "legacy_scenario",
    topic_id: scenarioData.topic_id || null,
    setting_id: scenarioData.setting_id || null,
    avatar_key:
      scenarioData.scenario?.avatar_key || scenarioData.avatar_key || "default_avatar",
  };
}

const VALID_CATEGORIES = [
  "GOOD",
  "ACCEPTABLE",
  "TOO_DIRECT",
  "STEREOTYPING",
  "TOO_PERSONAL",
  "DISMISSIVE",
  "SILENCE_OR_UNCLEAR",
];

function validateScenarioData(data, fileName) {
  const label = fileName || data?.scenario?.scenario_id || "unknown scenario";
  const objectiveIds = new Set(
    (data?.conversation_objectives || []).map(
      (objective) => objective.objective_id
    )
  );
  const requiredObjectiveIds =
    data?.session_rules?.required_objective_ids || [];
  const missingRequiredObjective = requiredObjectiveIds.find(
    (objectiveId) => !objectiveIds.has(objectiveId)
  );

  if (data?.schema_version !== "2.0") {
    throw new Error(`${label}: schema_version must be 2.0.`);
  }
  if (!data?.scenario?.scenario_id || !data?.scenario?.title) {
    throw new Error(`${label}: scenario_id and title are required.`);
  }
  if (!data?.context?.setting || !Array.isArray(data?.context?.boundaries)) {
    throw new Error(`${label}: context setting and boundaries are required.`);
  }
  if (!Array.isArray(data?.characters) || data.characters.length < 2) {
    throw new Error(`${label}: at least two characters are required.`);
  }
  if (objectiveIds.size < 1 || missingRequiredObjective) {
    throw new Error(`${label}: session objective references are invalid.`);
  }
  if (!Array.isArray(data?.conversation_stages) || data.conversation_stages.length < 1) {
    throw new Error(`${label}: conversation stages are required.`);
  }
  if (!data?.fallback_responses?.GOOD || !data?.fallback_responses?.SILENCE_OR_UNCLEAR) {
    throw new Error(`${label}: fallback responses are incomplete.`);
  }
}

function loadScenarios(directory) {
  const scenarios = new Map();

  fs.readdirSync(directory)
    .filter((fileName) => fileName.endsWith("_scenario.json"))
    .forEach((fileName) => {
      const fullPath = path.join(directory, fileName);
      const data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
      validateScenarioData(data, fileName);
      const scenarioId = data.scenario?.scenario_id;

      if (scenarioId) {
        scenarios.set(scenarioId.toUpperCase(), data);
      }
    });

  return scenarios;
}

async function getScenarioData(scenarioId) {
  const normalizedScenarioId = String(scenarioId || "").toUpperCase();

  if (mongoose.connection.readyState !== 1) {
    return scenarioMap.get(normalizedScenarioId) || null;
  }

  try {
    const scenario = await Scenario.findOne({ scenarioId: normalizedScenarioId });
    return scenario ? attachScenarioVersion(scenario.data, scenario.version) : null;
  } catch (err) {
    return scenarioMap.get(normalizedScenarioId) || null;
  }
}

function generateLecturerCode(name) {
  const cleanName = String(name || "DR").replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DR-${cleanName}-${randomStr}`;
}

function requireRole(roles) {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ error: "Access denied. Insufficient permissions." });
    }
  };
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function scenarioSummary(scenarioData) {
  const scenario = scenarioData.scenario;

  return {
    scenario_id: scenario.scenario_id,
    scenario_version: Number(scenario.scenario_version || scenario.version || scenarioData.version || 1),
    title: scenario.title,
    scenario_type: scenario.scenario_type,
    level: scenario.level,
    ar_scene: scenario.ar_scene,
    student_role: scenario.student_role,
    ai_role: scenario.ai_role,
    task_instruction: scenario.task_instruction,
  };
}

function attachScenarioVersion(scenarioData, version = 1) {
  const cloned = JSON.parse(JSON.stringify(scenarioData || {}));
  cloned.version = Number(version || cloned.version || 1);
  cloned.scenario = cloned.scenario || {};
  cloned.scenario.scenario_version = Number(
    cloned.scenario.scenario_version || cloned.scenario.version || cloned.version || 1
  );
  return cloned;
}

function getSessionRules(scenarioData) {
  const configured = scenarioData.session_rules || {};
  const objectiveIds = (scenarioData.conversation_objectives || [])
    .map((objective) => objective.objective_id)
    .filter(Boolean);

  return {
    minimumStudentResponses: Number(configured.minimum_student_responses) || 5,
    targetStudentResponsesMin:
      Number(configured.target_student_responses_min) || 6,
    targetStudentResponsesMax:
      Number(configured.target_student_responses_max) || 8,
    maximumStudentResponses:
      Number(configured.maximum_student_responses) || 10,
    requiredObjectiveIds:
      configured.required_objective_ids?.filter(Boolean) || objectiveIds,
    naturalClosingMessage:
      configured.natural_closing_message ||
      "Thank you for the conversation. I appreciate your help.",
  };
}

function detectCompletedObjectives(
  scenarioData,
  conversationHistory = [],
  studentResponse = ""
) {
  const studentMessages = conversationHistory
    .filter((item) => String(item?.speaker || "").toLowerCase() === "student")
    .map((item) => String(item?.message || "").trim())
    .filter(Boolean);
  const latestResponse = String(studentResponse || "").trim();

  if (
    latestResponse &&
    studentMessages[studentMessages.length - 1]?.toLowerCase() !==
      latestResponse.toLowerCase()
  ) {
    studentMessages.push(latestResponse);
  }

  const fullStudentText = studentMessages.join(" ").toLowerCase();
  return (scenarioData.conversation_objectives || [])
    .filter((objective) =>
      (objective.detection_cues || []).some((cue) =>
        fullStudentText.includes(String(cue).toLowerCase())
      )
    )
    .map((objective) => objective.objective_id);
}

function normalizeCompletedObjectiveIds(scenarioData, ...candidateLists) {
  const validIds = new Set(
    (scenarioData.conversation_objectives || [])
      .map((objective) => objective.objective_id)
      .filter(Boolean)
  );

  return [
    ...new Set(
      candidateLists
        .flatMap((candidate) => (Array.isArray(candidate) ? candidate : []))
        .filter((objectiveId) => validIds.has(objectiveId))
    ),
  ];
}

function buildSessionProgress(
  scenarioData,
  studentResponseCount,
  completedObjectiveIds
) {
  const rules = getSessionRules(scenarioData);
  const completed = new Set(completedObjectiveIds);
  const remainingObjectiveIds = rules.requiredObjectiveIds.filter(
    (objectiveId) => !completed.has(objectiveId)
  );
  const objectivesCompleted = remainingObjectiveIds.length === 0;
  const reachedMaximum =
    studentResponseCount >= rules.maximumStudentResponses;
  const reachedTarget =
    objectivesCompleted &&
    studentResponseCount >= rules.targetStudentResponsesMin;
  const sessionComplete = reachedMaximum || reachedTarget;

  return {
    student_response_count: studentResponseCount,
    minimum_student_responses: rules.minimumStudentResponses,
    target_student_responses_min: rules.targetStudentResponsesMin,
    target_student_responses_max: rules.targetStudentResponsesMax,
    maximum_student_responses: rules.maximumStudentResponses,
    completed_objective_ids: completedObjectiveIds,
    remaining_objective_ids: remainingObjectiveIds,
    objectives_completed: objectivesCompleted,
    session_complete: sessionComplete,
    end_reason: sessionComplete
      ? reachedMaximum && !reachedTarget
        ? "maximum_student_responses_reached"
        : "objectives_completed"
      : null,
  };
}

function normalizeRuntimeContext(input, topicInput = null) {
  if (!input) return null;

  const isGuidedSetting = Boolean(
    input.settingId || input.setting_id || input.aiCharacter || input.studentRole
  );

  if (isGuidedSetting) {
    const settingId = String(input.settingId || input.setting_id || "").toUpperCase();
    const topicId = String(
      input.topicId || input.topic_id || topicInput?.topicId || ""
    ).toLowerCase();
    const aiChar = input.aiCharacter || input.ai_character || {};
    const rules = input.sessionRules || input.session_rules || {};

    return {
      experience_type: "guided_topic",
      scenario_id: settingId,
      topic_id: topicId,
      setting_id: settingId,
      title: input.title || "",
      location: input.location || "",
      student_role: input.studentRole || input.student_role || "Student",
      ai_character: {
        display_name: aiChar.display_name || aiChar.displayName || "AI Character",
        role: aiChar.role || "AI Character",
        culture: aiChar.culture || "",
        avatar_key:
          aiChar.avatar_key ||
          aiChar.avatarKey ||
          input.avatarKey ||
          input.avatar_key ||
          "default_avatar",
      },
      language_objectives:
        topicInput?.languageObjectives || input.languageObjectives || [],
      icc_objectives:
        topicInput?.iccObjectives || input.iccObjectives || [],
      conversation_stages:
        input.conversationStages || input.conversation_stages || [],
      constraints: input.constraints || [],
      rubric: input.rubric || {},
      session_rules: {
        minimum_student_responses:
          Number(rules.minimumStudentResponses || rules.minimum_student_responses) || 5,
        target_student_responses_min:
          Number(rules.targetStudentResponsesMin || rules.target_student_responses_min) || 6,
        target_student_responses_max:
          Number(rules.targetStudentResponsesMax || rules.target_student_responses_max) || 8,
        maximum_student_responses:
          Number(rules.maximumStudentResponses || rules.maximum_student_responses) || 10,
      },
    };
  }

  const rules = getSessionRules(input);
  const scenarioObj = input.scenario || {};
  const contextObj = input.context || {};
  const aiChar =
    (input.characters || []).find((c) =>
      String(c.role || "").toLowerCase().includes("ai")
    ) || {};

  return {
    experience_type: input.experience_type || "legacy_scenario",
    scenario_id: String(
      scenarioObj.scenario_id || input.scenarioId || ""
    ).toUpperCase(),
    topic_id: input.topic_id || input.topicId || null,
    setting_id: input.setting_id || input.settingId || null,
    title: scenarioObj.title || "",
    location: contextObj.setting || scenarioObj.ar_scene || "",
    student_role: scenarioObj.student_role || scenarioObj.user_role || "Student",
    ai_character: {
      display_name: scenarioObj.ai_role || aiChar.name || "AI Character",
      role: scenarioObj.ai_role || aiChar.role || "AI Character",
      culture: scenarioObj.culture || aiChar.culture || "International",
      avatar_key:
        scenarioObj.avatar_key || input.avatar_key || "default_avatar",
    },
    language_objectives: input.language_objectives || [],
    icc_objectives:
      input.icc_objectives ||
      (input.conversation_objectives || []).map(
        (o) => o.title || o.objective_id
      ),
    conversation_stages: input.conversation_stages || [],
    constraints: contextObj.forbidden_terms || [],
    rubric: input.rubric || {},
    session_rules: {
      minimum_student_responses: rules.minimumStudentResponses,
      target_student_responses_min: rules.targetStudentResponsesMin,
      target_student_responses_max: rules.targetStudentResponsesMax,
      maximum_student_responses: rules.maximumStudentResponses,
    },
  };
}

function normalizeConversationHistory(conversationHistory = []) {
  return (Array.isArray(conversationHistory) ? conversationHistory : [])
    .map((item) => ({
      speaker:
        String(item?.speaker || "").toLowerCase() === "student"
          ? "Student"
          : "AI",
      message: String(item?.message || "").trim(),
    }))
    .filter((item) => item.message)
    .slice(-20);
}

function getDefaultLearnerNames(scenarioData) {
  const names = new Set(["Rina", "Raka"]);
  const learner = (scenarioData.characters || []).find((character) =>
    String(character.role || "").toLowerCase().includes("student learner")
  );
  const scenarioRole = String(scenarioData.scenario?.student_role || "");

  if (learner?.name && learner.name !== "Student") {
    names.add(learner.name);
  }

  const leadingName = scenarioRole.match(/^([A-Z][a-z]+)\b/);
  if (leadingName?.[1] && leadingName[1] !== "Student") {
    names.add(leadingName[1]);
  }

  return [...names];
}

function replaceDefaultLearnerNames(text, scenarioData, learnerProfile = {}) {
  if (typeof text !== "string") return text;
  const displayName = String(learnerProfile.displayName || "").trim();
  const replacement = displayName || "you";
  let cleaned = text;

  getDefaultLearnerNames(scenarioData).forEach((name) => {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleaned = cleaned.replace(new RegExp(`\\b${escapedName}\\b`, "g"), replacement);
  });

  return cleaned
    .replace(/\bI\s*(am|'m)\s+David\s+from\b/gi, "I am an exchange student from")
    .replace(/\bI\s*(am|'m)\s+David\b/gi, "I am an exchange student")
    .replace(/\bAre you you\b/gi, "Are you the student volunteer")
    .replace(/\bAre you (Rina|Raka)\b/gi, displayName ? `Are you ${displayName}` : "Are you the student volunteer")
    .replace(/\bHi, you\b/gi, displayName ? `Hi, ${displayName}` : "Hi")
    .replace(/\bHi, (Rina|Raka|David)\b/gi, displayName ? `Hi, ${displayName}` : "Hi")
    .replace(/\bThank you, you\b/gi, displayName ? `Thank you, ${displayName}` : "Thank you")
    .replace(/\bThank you, (Rina|Raka|David)\b/gi, displayName ? `Thank you, ${displayName}` : "Thank you")
    .replace(/,\s*(Rina|Raka|David)\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function getObjectiveFollowUp(
  scenarioData,
  remainingObjectiveIds,
  conversationHistory = []
) {
  const recentAiText = normalizeConversationHistory(conversationHistory)
    .filter((item) => item.speaker === "AI")
    .slice(-3)
    .map((item) => item.message.toLowerCase())
    .join(" ");
  const objectives = remainingObjectiveIds
    .map((remainingId) =>
      (scenarioData.conversation_objectives || []).find(
        (item) => item.objective_id === remainingId
      )
    )
    .filter(Boolean);
  const freshObjective = objectives.find((objective) => {
    const followUp = String(objective.ai_follow_up || "").toLowerCase();
    return followUp && !recentAiText.includes(followUp);
  });

  return freshObjective?.ai_follow_up || objectives[0]?.ai_follow_up || null;
}

function buildSessionMemory(
  scenarioData,
  conversationHistory = [],
  studentResponse = "",
  completedObjectiveIds = []
) {
  const history = normalizeConversationHistory(conversationHistory);
  const latestStudentResponse = String(studentResponse || "").trim();
  if (
    latestStudentResponse &&
    !(
      history.at(-1)?.speaker === "Student" &&
      history.at(-1)?.message.toLowerCase() ===
        latestStudentResponse.toLowerCase()
    )
  ) {
    history.push({ speaker: "Student", message: latestStudentResponse });
  }

  return {
    scenario_id: scenarioData.scenario.scenario_id,
    experience_type: scenarioData.experience_type || "legacy_scenario",
    topic_id: scenarioData.topic_id || null,
    setting_id: scenarioData.setting_id || null,
    setting: scenarioData.context.setting,
    student_role: scenarioData.scenario.student_role,
    ai_role: scenarioData.scenario.ai_role,
    completed_objective_ids: completedObjectiveIds,
    recent_exchanges: history.slice(-8),
  };
}

function cleanAiDialogue(value, scenarioData, learnerProfile = {}) {
  const cleaned = cleanScenarioText(
    replaceDefaultLearnerNames(value, scenarioData, learnerProfile),
    scenarioData
  );
  if (!cleaned) return cleaned;

  const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleaned];
  return sentences.slice(0, 2).join(" ").trim().slice(0, 360).trim();
}

function hasCasualCue(text) {
  const normalized = String(text || "").toLowerCase();

  return (
    /\b(bro|bruh|dude|buddy|mate|man)\b/.test(normalized) ||
    normalized.includes("yeah yeah") ||
    normalized.includes("ya ya")
  );
}

function hasPoliteCue(text) {
  return (
    text.includes("please") ||
    text.includes("could") ||
    text.includes("would") ||
    text.includes("may i") ||
    text.includes("thank") ||
    text.includes("sorry") ||
    text.includes("apolog")
  );
}

function cleanScenarioText(value, scenarioData) {
  if (typeof value !== "string") return value;

  let cleaned = value.trim();
  const aiCharacter = (scenarioData.characters || []).find((character) =>
    String(character.role || "").toLowerCase().includes("ai conversation")
  );
  if (aiCharacter?.name) {
    const escapedName = aiCharacter.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleaned = cleaned.replace(new RegExp(`^${escapedName}\\s*:\\s*`, "i"), "");
  }
  return cleaned;
}

function messageLeavesScenarioContext(message, scenarioData) {
  const text = String(message || "").toLowerCase();
  return (scenarioData.context?.forbidden_terms || []).some((term) =>
    text.includes(String(term).toLowerCase())
  );
}

function messageLooksLikeEvaluatorFeedback(message) {
  const text = String(message || "").toLowerCase();

  return (
    text.includes("your meaning") ||
    text.includes("your response") ||
    text.includes("your answer") ||
    text.includes("your message") ||
    text.includes("you can make it") ||
    text.includes("you can ask") ||
    text.includes("for example") ||
    text.includes("example:") ||
    text.includes("sounds a bit") ||
    text.includes("sounds too") ||
    text.includes("too direct") ||
    text.includes("too informal") ||
    text.includes("more politely") ||
    text.includes("speak more politely") ||
    text.includes("say it more politely") ||
    text.includes("could you please say") ||
    text.includes("it is better to say") ||
    text.includes("better to say") ||
    text.includes("detected category") ||
    text.includes("score")
  );
}

function messageWritesStudentDialogue(message, scenarioData) {
  const learner = (scenarioData.characters || []).find((character) =>
    String(character.role || "").toLowerCase().includes("student learner")
  );
  if (!learner?.name || learner.name === "Student") return false;

  const escapedName = learner.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\n)\\s*${escapedName}\\s*:`, "i").test(
    String(message || "")
  );
}

function detectCategory(studentResponse, scenarioData) {
  const text = String(studentResponse || "").toLowerCase().trim();
  const availableCategories = new Set(
    (scenarioData.branching_rules || []).map(
      (rule) => rule.student_response_category
    )
  );
  const supports = (category) =>
    availableCategories.size === 0 || availableCategories.has(category);

  if (!text || /^(uh+|um+|hmm+|\.\.\.)$/.test(text)) {
    return "SILENCE_OR_UNCLEAR";
  }

  if (
    /^(yes|yeah|yep|no|nope|okay|ok|sure|right|great|good|thanks|thank you|i see|of course)[.!]*$/.test(
      text
    )
  ) {
    return "ACCEPTABLE";
  }

  if (
    supports("TOO_PERSONAL") &&
    /\b(married|income|salary|religion|wife|husband|private family)\b/.test(text)
  ) {
    return "TOO_PERSONAL";
  }

  if (
    supports("STEREOTYPING") &&
    /\b(foreigners?|people from your (country|region)|all of you|everyone from|your people always)\b/.test(
      text
    )
  ) {
    return "STEREOTYPING";
  }

  if (
    supports("DISMISSIVE") &&
    /\b(i do not care|don't care|not important|too sensitive|just eat anything|whatever)\b/.test(
      text
    )
  ) {
    return "DISMISSIVE";
  }

  if (
    supports("TOO_DIRECT") &&
    (hasCasualCue(text) ||
      /\b(just follow me|follow me|go there|come here|sit there|you must|your idea is wrong|you are wrong|listen to me)\b/.test(
        text
      ) ||
      text.startsWith("give me"))
  ) {
    return "TOO_DIRECT";
  }

  const matchesObjective = (scenarioData.conversation_objectives || []).some(
    (objective) =>
      (objective.detection_cues || []).some((cue) =>
        text.includes(String(cue).toLowerCase())
      )
  );

  return hasPoliteCue(text) || matchesObjective ? "GOOD" : "ACCEPTABLE";
}

function generateScores(category) {
  const scores = {
    GOOD: {
      grammar: 5,
      vocabulary: 4,
      fluency: 5,
      politeness: 5,
      pragmatic_appropriateness: 5,
      intercultural_awareness: 5,
    },
    ACCEPTABLE: {
      grammar: 3,
      vocabulary: 3,
      fluency: 3,
      politeness: 3,
      pragmatic_appropriateness: 3,
      intercultural_awareness: 3,
    },
    TOO_DIRECT: {
      grammar: 4,
      vocabulary: 3,
      fluency: 4,
      politeness: 2,
      pragmatic_appropriateness: 2,
      intercultural_awareness: 3,
    },
    TOO_PERSONAL: {
      grammar: 4,
      vocabulary: 3,
      fluency: 4,
      politeness: 2,
      pragmatic_appropriateness: 1,
      intercultural_awareness: 1,
    },
    STEREOTYPING: {
      grammar: 4,
      vocabulary: 3,
      fluency: 4,
      politeness: 2,
      pragmatic_appropriateness: 2,
      intercultural_awareness: 1,
    },
    DISMISSIVE: {
      grammar: 3,
      vocabulary: 3,
      fluency: 3,
      politeness: 2,
      pragmatic_appropriateness: 2,
      intercultural_awareness: 2,
    },
    SILENCE_OR_UNCLEAR: {
      grammar: 1,
      vocabulary: 1,
      fluency: 1,
      politeness: 1,
      pragmatic_appropriateness: 1,
      intercultural_awareness: 1,
    },
  };

  return scores[category] || scores.ACCEPTABLE;
}

function generateAIMessage(
  category,
  scenarioData,
  remainingObjectiveIds,
  studentResponse = "",
  conversationHistory = []
) {
  const objectiveFollowUp = getObjectiveFollowUp(
    scenarioData,
    remainingObjectiveIds,
    conversationHistory
  );
  const fallbackResponses = scenarioData.fallback_responses || {};
  const shortResponse = String(studentResponse || "").toLowerCase().trim();

  if (/^(yes|yeah|yep|okay|ok|sure|right|of course)[.!]*$/.test(shortResponse)) {
    return objectiveFollowUp
      ? `Great. ${objectiveFollowUp}`
      : "Great, thank you. Tell me a little more about that.";
  }

  if (/^(no|nope)[.!]*$/.test(shortResponse)) {
    return objectiveFollowUp
      ? `That's all right. ${objectiveFollowUp}`
      : "That's all right. What would you like to talk about next?";
  }

  if (/^(thanks|thank you)[.!]*$/.test(shortResponse)) {
    return objectiveFollowUp
      ? `You're welcome. ${objectiveFollowUp}`
      : "You're welcome. I'm glad we could talk about it.";
  }

  if (["GOOD", "ACCEPTABLE"].includes(category) && objectiveFollowUp) {
    return objectiveFollowUp;
  }

  return (
    fallbackResponses[category] ||
    fallbackResponses.ACCEPTABLE ||
    "Thank you. Could you tell me a little more?"
  );
}

function generateFeedback(category, studentResponse = "", scenarioData) {
  const text = String(studentResponse || "").toLowerCase();
  const branchingRule = (scenarioData.branching_rules || []).find(
    (rule) => rule.student_response_category === category
  );

  const feedback = {
    GOOD: "Your response is polite, clear, and appropriate for this scenario.",
    ACCEPTABLE: "Your response is understandable, but you can make it more complete and polite.",
    TOO_DIRECT: hasCasualCue(text)
      ? "Your response is understandable, but it sounds too informal for a first meeting or academic setting."
      : "Your response is understandable, but it sounds too direct for this context.",
    TOO_PERSONAL: "Your response asks about a private topic too early in the conversation.",
    STEREOTYPING: "Avoid generalizing people based on nationality, region, culture, or identity.",
    DISMISSIVE: "Try to acknowledge the other person's concern before giving instructions or disagreeing.",
    SILENCE_OR_UNCLEAR: "Your response is too short or unclear. Try using a complete sentence.",
  };

  const baseFeedback = feedback[category] || feedback.ACCEPTABLE;
  return branchingRule?.feedback_focus
    ? `${baseFeedback} Focus: ${branchingRule.feedback_focus}.`
    : baseFeedback;
}

function generateImprovedResponse(category, scenarioData) {
  const examples = scenarioData.scenario.good_response_examples || [];
  return examples[0] || "Could you express that in a clear and respectful way?";
}

function buildCoachingEvent(category, studentResponse, turnNumber = 1) {
  if (!category || category === "GOOD" || category === "ACCEPTABLE" || category === "SILENCE_OR_UNCLEAR") {
    return null;
  }

  const map = {
    TOO_DIRECT: {
      category: "excessive_directness",
      short_hint: "Consider using softer, modal phrasing (e.g. 'Would it be possible...' or 'Could you please...').",
      explanation: "Direct imperatives can sound overly commanding in academic and professional contexts.",
      improved_response: "Could you please explain that in a bit more detail when you have a moment?",
    },
    TOO_PERSONAL: {
      category: "personal_boundaries",
      short_hint: "In international academic settings, personal topics (e.g., salary, marital status) are usually avoided early on.",
      explanation: "Respecting personal privacy boundaries helps build comfortable rapport with international peers.",
      improved_response: "What do you enjoy doing around campus during your free time?",
    },
    STEREOTYPING: {
      category: "stereotyping",
      short_hint: "Avoid broad generalizations about an entire nationality or cultural background.",
      explanation: "Intercultural competence involves acknowledging individual preferences rather than making broad assumptions.",
      improved_response: "What has your personal experience been like so far?",
    },
    DISMISSIVE: {
      category: "dismissiveness",
      short_hint: "Express empathy and acknowledge your conversation partner's perspective politely.",
      explanation: "Dismissive phrasing can reduce mutual trust during collaborative intercultural dialogue.",
      improved_response: "I understand your perspective. Let's see how we can find a common solution.",
    },
  };

  const details = map[category];
  if (!details) return null;

  return {
    turn_number: turnNumber,
    student_utterance: studentResponse,
    category: details.category,
    short_hint: details.short_hint,
    explanation: details.explanation,
    improved_response: details.improved_response,
  };
}

function buildRuleBasedResponse({
  session_id,
  scenario_id,
  turn_number,
  conversation_history,
  student_response,
  scenarioData,
  learnerProfile = {},
}) {
  const detectedCategory = detectCategory(student_response, scenarioData);
  const scores = generateScores(detectedCategory);
  const studentResponseCount = Number(turn_number);
  const completedObjectiveIds = detectCompletedObjectives(
    scenarioData,
    conversation_history,
    student_response
  );
  const sessionProgress = buildSessionProgress(
    scenarioData,
    studentResponseCount,
    completedObjectiveIds
  );
  const rules = getSessionRules(scenarioData);
  const regularAiMessage = generateAIMessage(
    detectedCategory,
    scenarioData,
    sessionProgress.remaining_objective_ids,
    student_response,
    conversation_history
  );

  const coachingEvent = buildCoachingEvent(
    detectedCategory,
    student_response,
    studentResponseCount
  );

  return {
    session_id,
    scenario_id,
    ...getExperienceMetadata(scenarioData),
    turn_number: studentResponseCount,
    ai_message: cleanAiDialogue(
      sessionProgress.session_complete
        ? rules.naturalClosingMessage
        : regularAiMessage,
      scenarioData,
      learnerProfile
    ),
    detected_category: detectedCategory,
    scores,
    feedback: generateFeedback(detectedCategory, student_response, scenarioData),
    cultural_note: cleanScenarioText(scenarioData.scenario.cultural_note, scenarioData),
    improved_response: generateImprovedResponse(detectedCategory, scenarioData),
    coaching_event: coachingEvent,
    continue_conversation: !sessionProgress.session_complete,
    completed_objective_ids: completedObjectiveIds,
    session_progress: sessionProgress,
    session_memory: buildSessionMemory(
      scenarioData,
      conversation_history,
      student_response,
      completedObjectiveIds
    ),
    end_reason: sessionProgress.end_reason,
    source: "rule_based",
    conversation_history: conversation_history || [],
  };
}

function normalizeOpenAIResult(
  aiResult,
  sessionId,
  studentResponseCount,
  studentResponse,
  scenarioData,
  conversationHistory,
  learnerProfile = {}
) {
  const numericTurn = Number(studentResponseCount);
  const detectedCategory = VALID_CATEGORIES.includes(aiResult?.detected_category)
    ? aiResult.detected_category
    : detectCategory(studentResponse, scenarioData);

  const cueDetectedObjectiveIds = detectCompletedObjectives(
    scenarioData,
    conversationHistory,
    studentResponse
  );
  const completedObjectiveIds = normalizeCompletedObjectiveIds(
    scenarioData,
    cueDetectedObjectiveIds,
    aiResult?.completed_objective_ids
  );
  const sessionProgress = buildSessionProgress(
    scenarioData,
    numericTurn,
    completedObjectiveIds
  );
  const rules = getSessionRules(scenarioData);
  const coachingEvent = buildCoachingEvent(
    detectedCategory,
    studentResponse,
    numericTurn
  );

  const normalized = {
    ...aiResult,
    session_id: sessionId,
    scenario_id: scenarioData.scenario.scenario_id,
    ...getExperienceMetadata(scenarioData),
    turn_number: numericTurn,
    detected_category: detectedCategory,
    scores: aiResult?.scores || generateScores(detectedCategory),
    feedback: cleanScenarioText(
      aiResult?.feedback || generateFeedback(detectedCategory, studentResponse, scenarioData),
      scenarioData
    ),
    cultural_note: cleanScenarioText(
      aiResult?.cultural_note || scenarioData.scenario.cultural_note,
      scenarioData
    ),
    improved_response: cleanScenarioText(
      aiResult?.improved_response || generateImprovedResponse(detectedCategory, scenarioData),
      scenarioData
    ),
    coaching_event: coachingEvent,
    continue_conversation: !sessionProgress.session_complete,
    completed_objective_ids: completedObjectiveIds,
    session_progress: sessionProgress,
    session_memory: buildSessionMemory(
      scenarioData,
      conversationHistory,
      studentResponse,
      completedObjectiveIds
    ),
    end_reason: sessionProgress.end_reason,
  };

  const aiMessage = String(aiResult?.ai_message || "").trim();
  const shouldUseFallbackMessage =
    !aiMessage ||
    messageLooksLikeEvaluatorFeedback(aiMessage) ||
    messageWritesStudentDialogue(aiMessage, scenarioData) ||
    messageLeavesScenarioContext(aiMessage, scenarioData);

  normalized.ai_message = cleanAiDialogue(
    sessionProgress.session_complete
      ? rules.naturalClosingMessage
      : shouldUseFallbackMessage
      ? generateAIMessage(
          detectedCategory,
          scenarioData,
          sessionProgress.remaining_objective_ids,
          studentResponse,
          conversationHistory
        )
      : aiMessage,
    scenarioData,
    learnerProfile
  );

  return normalized;
}

function normalizeLearningId(value) {
  return String(value || "").trim().toUpperCase();
}

function validateLearningId(value, fieldName) {
  const normalized = normalizeLearningId(value);
  if (!normalized) return `${fieldName} is required`;
  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)) {
    return `${fieldName} must use uppercase letters, numbers, and single hyphens`;
  }
  return null;
}

function extractLaunchToken(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    return String(parsed.searchParams.get("token") || "").trim();
  } catch (_) {
    return raw.replace(/^orbis:\/\/launch\?token=/i, "").trim();
  }
}

function hashLaunchToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function serializeLearningModule(module) {
  return {
    id: module._id,
    module_id: module.moduleId,
    title: module.title,
    description: module.description || "",
    display_order: module.displayOrder || 0,
    is_active: module.isActive !== false,
    created_at: module.createdAt,
    updated_at: module.updatedAt,
  };
}

function serializeLearningUnit(unit) {
  return {
    id: unit._id,
    unit_id: unit.unitId,
    module_id: unit.moduleId,
    title: unit.title,
    description: unit.description || "",
    display_order: unit.displayOrder || 0,
    is_active: unit.isActive !== false,
    created_at: unit.createdAt,
    updated_at: unit.updatedAt,
  };
}

function serializeLearningPage(page) {
  return {
    id: page._id,
    page_id: page.pageId,
    module_id: page.moduleId,
    unit_id: page.unitId,
    title: page.title,
    instructions: page.instructions || "",
    setting_id: page.settingId,
    display_order: page.displayOrder || 0,
    is_active: page.isActive !== false,
    created_at: page.createdAt,
    updated_at: page.updatedAt,
  };
}

async function buildLearningModuleTree() {
  const [modules, units, pages] = await Promise.all([
    LearningModule.find().sort({ displayOrder: 1, title: 1 }).lean(),
    LearningUnit.find().sort({ displayOrder: 1, title: 1 }).lean(),
    LearningPage.find().sort({ displayOrder: 1, title: 1 }).lean(),
  ]);
  return modules.map((module) => ({
    ...serializeLearningModule(module),
    units: units
      .filter((unit) => unit.moduleId === module.moduleId)
      .map((unit) => ({
        ...serializeLearningUnit(unit),
        pages: pages
          .filter((page) => page.unitId === unit.unitId)
          .map(serializeLearningPage),
      })),
  }));
}

app.get("/", async (req, res) => {
  const defaultScenario = await getScenarioData(defaultScenarioId);
  const scenarioCount = await Scenario.countDocuments();

  res.json({
    message: "Intercultural AI Backend is running",
    default_scenario_id: defaultScenarioId,
    default_title: defaultScenario?.scenario?.title,
    scenario_count: scenarioCount,
    use_openai: process.env.USE_OPENAI === "true",
    openai_service_loaded: Boolean(evaluateWithOpenAI),
  });
});

// JWT Authentication Middleware
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: "Invalid or expired token" });
      }
      req.user = decoded; // Decoded is { userId, email, role }
      next();
    });
  } else {
    res.status(401).json({ error: "Authorization header is missing" });
  }
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Insufficient permissions." });
    }
    next();
  };
}

async function resolveLecturerRoster(
  requestUser,
  { consentOnly = false, forceLookup = false } = {}
) {
  const isAdmin = requestUser?.role === "admin";
  if (isAdmin && !consentOnly && !forceLookup) {
    return { isAdmin: true, lecturerCode: null, students: [] };
  }

  if (mongoose.connection.readyState !== 1 && !forceLookup) {
    return {
      isAdmin,
      lecturerCode: requestUser?.lecturerCode || null,
      students: [],
    };
  }

  let lecturerCode = null;
  if (!isAdmin) {
    const lecturer = await User.findById(requestUser?.userId);
    lecturerCode = lecturer?.lecturerCode || requestUser?.lecturerCode || null;
    if (!lecturerCode) {
      const error = new Error("Lecturer profile is incomplete.");
      error.statusCode = 400;
      throw error;
    }
  }

  const filter = {
    role: "student",
    ...(isAdmin ? {} : { studentLecturerCode: lecturerCode }),
    ...(consentOnly ? { consent: true } : {}),
  };
  const students = await User.find(filter).sort({ name: 1 });

  return { isAdmin, lecturerCode, students };
}

function buildLecturerOwnershipFilter(scope) {
  if (scope?.isAdmin && !scope?.students?.length) return null;

  const userIds = (scope?.students || []).map((student) => student._id).filter(Boolean);
  const studentIds = (scope?.students || [])
    .map((student) => student.studentId)
    .filter(Boolean);

  return {
    $or: [
      { userId: { $in: userIds } },
      { "student.student_id": { $in: studentIds } },
    ],
  };
}

function combineSessionFilters(ownershipFilter, requestedFilter = {}) {
  if (!ownershipFilter) return requestedFilter;
  if (Object.keys(requestedFilter).length === 0) return ownershipFilter;
  return { $and: [ownershipFilter, requestedFilter] };
}

function normalizePracticeSessionPayload(rawSession, userId) {
  const student = rawSession.student || {};
  const scenario = rawSession.scenario || {};
  const scenarioVersion = Number(
    scenario.scenario_version || rawSession.scenario_version || rawSession.scenarioVersion || 1
  );
  const topicId = rawSession.topicId || rawSession.topic_id || null;
  const settingId = rawSession.settingId || rawSession.setting_id || null;
  const experienceType =
    rawSession.experienceType ||
    rawSession.experience_type ||
    (topicId || settingId ? "guided_topic" : "legacy_scenario");
  const launchSource =
    rawSession.launchSource ||
    rawSession.launch_source ||
    (experienceType === "guided_topic" ? "browse" : "legacy");

  return {
    userId,
    sessionId: rawSession.sessionId || rawSession.session_id,
    scenario: {
      ...scenario,
      scenario_version: scenarioVersion,
    },
    transcript: Array.isArray(rawSession.transcript)
      ? rawSession.transcript.map((item) => ({
          speaker: item.speaker,
          message: item.message,
          timestamp: item.timestamp,
        }))
      : [],
    overallScore: Number(rawSession.overallScore ?? rawSession.overall_score ?? 0),
    averageScores: rawSession.averageScores || rawSession.average_scores || {},
    status: rawSession.status || "completed",
    endReason: rawSession.endReason || rawSession.end_reason,
    durationSeconds: Number(rawSession.durationSeconds ?? rawSession.duration_seconds ?? 0),
    studentResponseCount: Number(
      rawSession.studentResponseCount ?? rawSession.student_response_count ?? 0
    ),
    startedAt: rawSession.startedAt || rawSession.started_at,
    completedAt: rawSession.completedAt || rawSession.completed_at || new Date(),
    evaluations: Array.isArray(rawSession.evaluations) ? rawSession.evaluations : [],
    completedObjectiveIds:
      rawSession.completedObjectiveIds || rawSession.completed_objective_ids || [],
    student: {
      student_id: student.student_id || rawSession.studentId || "local_student",
      display_name: student.display_name || rawSession.studentName || null,
    },
    experienceType,
    topicId,
    topicTitle: rawSession.topicTitle || rawSession.topic_title || null,
    settingId,
    settingTitle: rawSession.settingTitle || rawSession.setting_title || null,
    avatarKey: rawSession.avatarKey || rawSession.avatar_key || null,
    launchSource,
    moduleId: rawSession.moduleId || rawSession.module_id || null,
    unitId: rawSession.unitId || rawSession.unit_id || null,
    pageId: rawSession.pageId || rawSession.page_id || null,
    coachingEvents: Array.isArray(
      rawSession.coachingEvents || rawSession.coaching_events
    )
      ? rawSession.coachingEvents || rawSession.coaching_events
      : [],
    latencyMetrics: Array.isArray(
      rawSession.latencyMetrics || rawSession.latency_metrics
    )
      ? rawSession.latencyMetrics || rawSession.latency_metrics
      : [],
    latencySummary:
      rawSession.latencySummary || rawSession.latency_summary || {},
  };
}

function serializePracticeSession(session) {
  const data = typeof session.toObject === "function" ? session.toObject() : session;

  return {
    schema_version: 2,
    session_id: data.sessionId,
    student: data.student || {
      student_id: "local_student",
      display_name: null,
    },
    scenario: data.scenario || {},
    scenario_version: data.scenario?.scenario_version || 1,
    started_at: data.startedAt
      ? new Date(data.startedAt).toISOString()
      : new Date(data.completedAt || Date.now()).toISOString(),
    completed_at: new Date(data.completedAt || Date.now()).toISOString(),
    duration_seconds: data.durationSeconds || 0,
    status: data.status || "completed",
    end_reason: data.endReason || null,
    student_response_count: data.studentResponseCount || 0,
    transcript: (data.transcript || []).map((item) => ({
      speaker: item.speaker,
      message: item.message,
    })),
    evaluations: data.evaluations || [],
    average_scores: data.averageScores || {},
    overall_score: data.overallScore || 0,
    completed_objective_ids: data.completedObjectiveIds || [],
    experience_type: data.experienceType || "legacy_scenario",
    topic_id: data.topicId || null,
    topic_title: data.topicTitle || null,
    setting_id: data.settingId || null,
    setting_title: data.settingTitle || null,
    avatar_key: data.avatarKey || null,
    launch_source: data.launchSource || "legacy",
    module_id: data.moduleId || null,
    unit_id: data.unitId || null,
    page_id: data.pageId || null,
    coaching_events: data.coachingEvents || [],
    latency_metrics: data.latencyMetrics || [],
    latency_summary: data.latencySummary || {},
  };
}

// ─── Rate Limiters ───
const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Terlalu banyak percakapan auth. Coba lagi dalam 15 menit." },
});

const openAILimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Batas permintaan OpenAI tercapai. Harap tunggu beberapa saat." },
});

app.use("/api/auth", authLimiter);
app.use("/api/openai", openAILimiter);

// ─── Analytics Endpoints ───

app.get("/api/analytics/summary", authenticateJWT, requireRole(["admin", "lecturer"]), async (req, res) => {
  try {
    const isLecturer = req.user.role === "lecturer";
    const scope = isLecturer
      ? await resolveLecturerRoster(req.user, { forceLookup: true })
      : null;
    const sessionQuery = isLecturer
      ? combineSessionFilters(buildLecturerOwnershipFilter(scope))
      : {};

    const [totalStudents, sessions] = await Promise.all([
      isLecturer ? scope.students.length : User.countDocuments({ role: "student" }),
      PracticeSession.find(sessionQuery).lean(),
    ]);

    const completed = sessions.filter(s => s.status === "completed" || s.status === "ended_manually");
    const totalSessions = sessions.length;
    const completedCount = completed.length;

    const avgScore = completed.length
      ? completed.reduce((sum, s) => sum + Number(s.overallScore || 0), 0) / completed.length
      : 0;

    const avgDuration = completed.length
      ? completed.reduce((sum, s) => sum + Number(s.durationSeconds || 0), 0) / completed.length
      : 0;

    res.json({
      success: true,
      data: {
        totalStudents,
        totalSessions,
        completedCount,
        averageScore: Number(avgScore.toFixed(2)),
        averageDurationSeconds: Math.round(avgDuration),
      },
    });
  } catch (error) {
    console.error("Analytics summary error:", error);
    res.status(500).json({ error: "Gagal mengambil data ringkasan analitik." });
  }
});

app.get("/api/analytics/longitudinal", authenticateJWT, requireRole(["admin", "lecturer"]), async (req, res) => {
  try {
    const scope = req.user.role === "lecturer"
      ? await resolveLecturerRoster(req.user, { forceLookup: true })
      : null;
    const sessionQuery = scope
      ? combineSessionFilters(buildLecturerOwnershipFilter(scope))
      : {};

    const sessions = await PracticeSession.find(sessionQuery)
      .populate("userId", "name studentId email")
      .sort({ completedAt: 1, createdAt: 1 })
      .lean();

    const timeline = sessions.map((s, index) => ({
      sessionId: s.sessionId,
      sessionIndex: index + 1,
      studentName: s.userId?.name || "Mahasiswa",
      studentId: s.userId?.studentId || "-",
      scenarioId: s.scenario?.scenario_id || "G-ICC-001",
      scenarioTitle: s.scenario?.title || "-",
      overallScore: Number((s.overallScore || 0).toFixed(2)),
      completedAt: s.completedAt || s.createdAt,
      averageScores: s.averageScores || {},
    }));

    res.json({
      success: true,
      count: timeline.length,
      timeline,
    });
  } catch (error) {
    console.error("Analytics longitudinal error:", error);
    res.status(500).json({ error: "Gagal mengambil data tren longitudinal." });
  }
});

// ─── Authentication Endpoints ───

app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password, gender, studentId, studentLecturerCode, consent } = req.body;
  if (!name || !email || !password || !gender) {
    return res.status(400).json({ error: "Name, email, password, and gender are required" });
  }

  // Validasi khusus untuk mahasiswa
  if (!studentId || !studentLecturerCode || consent !== true) {
    return res.status(400).json({ error: "Student ID, valid lecturer code, and research consent are required." });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    // Validasi lecturer code ke DB
    const lecturer = await User.findOne({
      role: "lecturer",
      lecturerCode: String(studentLecturerCode).trim().toUpperCase()
    });
    if (!lecturer) {
      return res.status(400).json({ error: "Lecturer code is invalid" });
    }

    const user = new User({
      name,
      email,
      password,
      gender,
      role: "student",
      studentId: studentId.trim(),
      studentLecturerCode: studentLecturerCode.trim().toUpperCase(),
      consent: true,
      consentAcceptedAt: new Date(),
    });
    await user.save();
    
    const token = jwt.sign({ userId: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
    res.status(201).json({
      token,
      user: {
        name: user.name,
        email: user.email,
        gender: user.gender,
        role: user.role,
        studentId: user.studentId,
        studentLecturerCode: user.studentLecturerCode,
        consent: user.consent,
        consentAcceptedAt: user.consentAcceptedAt
      }
    });
  } catch (err) {
    console.error("Signup Endpoint Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    const token = jwt.sign({ userId: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
    res.json({
      token,
      user: {
        name: user.name,
        email: user.email,
        gender: user.gender,
        role: user.role,
        lecturerCode: user.lecturerCode,
        studentLecturerCode: user.studentLecturerCode,
        studentId: user.studentId,
        consent: user.consent,
        consentAcceptedAt: user.consentAcceptedAt
      }
    });
  } catch (err) {
    console.error("Login Endpoint Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/update", authenticateJWT, async (req, res) => {
  const { name, gender } = req.body;
  if (!name || !gender) {
    return res.status(400).json({ error: "Name and gender are required" });
  }
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    user.name = name;
    user.gender = gender;
    await user.save();
    
    res.json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
        gender: user.gender,
        role: user.role,
        lecturerCode: user.lecturerCode,
        studentLecturerCode: user.studentLecturerCode,
        studentId: user.studentId,
        consent: user.consent,
        consentAcceptedAt: user.consentAcceptedAt
      }
    });
  } catch (err) {
    console.error("Profile Update Endpoint Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Authenticated History Endpoints ───

app.get("/api/history", authenticateJWT, async (req, res) => {
  try {
    const sessions = await PracticeSession.find({ userId: req.user.userId }).sort({ completedAt: -1 });
    res.json(sessions.map(serializePracticeSession));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/history", authenticateJWT, async (req, res) => {
  try {
    const sessionData = normalizePracticeSessionPayload(req.body, req.user.userId);

    if (!sessionData.sessionId) {
      return res.status(400).json({ error: "session_id is required" });
    }
    
    // Upsert based on sessionId
    const session = await PracticeSession.findOneAndUpdate(
      { sessionId: sessionData.sessionId, userId: req.user.userId },
      sessionData,
      { new: true, upsert: true, runValidators: true }
    );
    res.status(201).json(serializePracticeSession(session));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/history/:session_id", authenticateJWT, async (req, res) => {
  try {
    const result = await PracticeSession.findOneAndDelete({
      sessionId: req.params.session_id,
      userId: req.user.userId
    });
    if (!result) {
      return res.status(404).json({ error: "Session record not found" });
    }
    res.json({ success: true, message: "Session deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/scenarios", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json(
        Array.from(scenarioMap.values())
          .map((item) => scenarioSummary(item))
          .sort((left, right) => left.scenario_id.localeCompare(right.scenario_id))
      );
    }

    const list = await Scenario.find({ isActive: true });
    const summaries = list
      .map((item) => scenarioSummary(attachScenarioVersion(item.data, item.version)))
      .sort((left, right) => left.scenario_id.localeCompare(right.scenario_id));
    res.json(summaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/scenarios/:scenario_id", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const scenarioData = scenarioMap.get(req.params.scenario_id.toUpperCase());
      if (!scenarioData) {
        return res.status(404).json({
          error: true,
          message: `Scenario ${req.params.scenario_id} is not available.`,
        });
      }
      return res.json(scenarioData);
    }

    const scenario = await Scenario.findOne({
      scenarioId: req.params.scenario_id.toUpperCase(),
      isActive: true
    });

    if (!scenario) {
      return res.status(404).json({
        error: true,
        message: `Scenario ${req.params.scenario_id} is not available.`,
      });
    }

    return res.json(attachScenarioVersion(scenario.data, scenario.version));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Lecturer Endpoints ───

app.get("/api/topics", async (req, res) => {
  try {
    const topics = mongoose.connection.readyState === 1
      ? await Topic.find({ isActive: true }).sort({ displayOrder: 1, title: 1 }).lean()
      : topicsData
          .filter((topic) => topic.isActive !== false)
          .sort((left, right) => left.displayOrder - right.displayOrder);
    return res.json(topics.map(serializeTopic));
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

app.get("/api/topics/:topic_id", async (req, res) => {
  try {
    const topic = await findActiveTopic(req.params.topic_id);
    if (!topic) {
      return res.status(404).json({
        error: true,
        message: `Topic ${req.params.topic_id} is not available.`,
      });
    }
    return res.json(serializeTopic(topic));
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

app.get("/api/topics/:topic_id/settings", async (req, res) => {
  try {
    const topic = await findActiveTopic(req.params.topic_id);
    if (!topic) {
      return res.status(404).json({
        error: true,
        message: `Topic ${req.params.topic_id} is not available.`,
      });
    }
    const settings = mongoose.connection.readyState === 1
      ? await Setting.find({ topicId: topic.topicId, isActive: true })
          .sort({ displayOrder: 1, title: 1 })
          .lean()
      : settingsData
          .filter(
            (setting) =>
              setting.topicId === topic.topicId && setting.isActive !== false
          )
          .sort((left, right) => left.displayOrder - right.displayOrder);
    return res.json(settings.map((setting) => serializeSetting(setting, topic)));
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

app.get("/api/settings/:setting_id", async (req, res) => {
  try {
    const setting = await findActiveSetting(req.params.setting_id);
    if (!setting) {
      return res.status(404).json({
        error: true,
        message: `Setting ${req.params.setting_id} is not available.`,
      });
    }
    const topic = await findActiveTopic(setting.topicId);
    if (!topic) {
      return res.status(404).json({
        error: true,
        message: `Topic ${setting.topicId} is not available.`,
      });
    }
    return res.json(serializeSetting(setting, topic));
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

app.get("/api/lecturer/students", authenticateJWT, requireRole(["admin", "lecturer"]), async (req, res) => {
  try {
    const scope = await resolveLecturerRoster(req.user, { forceLookup: true });

    res.json(scope.students.map(s => ({
      id: s._id,
      name: s.name,
      email: s.email,
      gender: s.gender,
      studentId: s.studentId,
      consent: s.consent,
      consentAcceptedAt: s.consentAcceptedAt,
      createdAt: s.createdAt
    })));
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.get("/api/lecturer/history", authenticateJWT, requireRole(["lecturer"]), async (req, res) => {
  try {
    const lecturer = await User.findById(req.user.userId);
    if (!lecturer || !lecturer.lecturerCode) {
      return res.status(400).json({ error: "Lecturer profile is incomplete." });
    }
    const students = await User.find({
      role: "student",
      studentLecturerCode: lecturer.lecturerCode
    });
    const studentIds = students.map(s => s._id);

    const { topic_id, setting_id, scenario_id, student_id, status, start_date, end_date } = req.query;
    const filter = { userId: { $in: studentIds } };

    if (topic_id) filter.topicId = String(topic_id).toLowerCase().trim();
    if (setting_id) filter.settingId = String(setting_id).toUpperCase().trim();
    if (scenario_id) filter["scenario.scenario_id"] = String(scenario_id).toUpperCase().trim();
    if (student_id) {
      const ownsStudent = studentIds.some(
        (id) => String(id) === String(student_id)
      );
      if (!ownsStudent) {
        return res.status(403).json({ error: "Student is not linked to this lecturer." });
      }
      filter.userId = student_id;
    }
    if (status) filter.status = status;
    if (start_date || end_date) {
      filter.completedAt = {};
      if (start_date) filter.completedAt.$gte = new Date(start_date);
      if (end_date) filter.completedAt.$lte = new Date(end_date);
    }

    const sessions = await PracticeSession.find(filter)
      .populate("userId", "name email studentId consent consentAcceptedAt")
      .sort({ completedAt: -1 });

    res.json(sessions.map(s => {
      const serialized = serializePracticeSession(s);
      return {
        ...serialized,
        student_details: s.userId ? {
          name: s.userId.name,
          email: s.userId.email,
          student_id: s.userId.studentId,
          consent: s.userId.consent,
          consent_accepted_at: s.userId.consentAcceptedAt
        } : null
      };
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/lecturer/research-summary", authenticateJWT, requireRole(["lecturer"]), async (req, res) => {
  try {
    const lecturer = await User.findById(req.user.userId);
    if (!lecturer?.lecturerCode) {
      return res.status(400).json({ error: "Lecturer profile is incomplete." });
    }
    const students = await User.find({
      role: "student",
      studentLecturerCode: lecturer.lecturerCode,
    }).select("_id");
    const studentIds = students.map((student) => student._id);
    const { topic_id, setting_id, scenario_id, student_id, status, start_date, end_date } = req.query;
    const filter = { userId: { $in: studentIds } };

    if (student_id) {
      const ownsStudent = studentIds.some((id) => String(id) === String(student_id));
      if (!ownsStudent) return res.status(403).json({ error: "Student is not linked to this lecturer." });
      filter.userId = student_id;
    }
    if (topic_id) filter.topicId = String(topic_id).toLowerCase().trim();
    if (setting_id) filter.settingId = String(setting_id).toUpperCase().trim();
    if (scenario_id) filter["scenario.scenario_id"] = String(scenario_id).toUpperCase().trim();
    if (status) filter.status = status;
    if (start_date || end_date) {
      filter.completedAt = {};
      if (start_date) filter.completedAt.$gte = new Date(start_date);
      if (end_date) filter.completedAt.$lte = new Date(end_date);
    }

    const sessions = await PracticeSession.find(filter).lean();
    const completedStatuses = new Set(["completed", "ended_manually"]);
    const completedSessions = sessions.filter((session) => completedStatuses.has(session.status));
    const summarize = (items) => ({
      sessions: items.length,
      completed_sessions: items.filter((item) => completedStatuses.has(item.status)).length,
      completion_rate: items.length
        ? Number((items.filter((item) => completedStatuses.has(item.status)).length / items.length).toFixed(4))
        : 0,
      average_score: items.length
        ? Number((items.reduce((sum, item) => sum + Number(item.overallScore || 0), 0) / items.length).toFixed(2))
        : 0,
      average_duration_seconds: items.length
        ? Number((items.reduce((sum, item) => sum + Number(item.durationSeconds || 0), 0) / items.length).toFixed(2))
        : 0,
      average_student_responses: items.length
        ? Number((items.reduce((sum, item) => sum + Number(item.studentResponseCount || 0), 0) / items.length).toFixed(2))
        : 0,
    });
    const groupBy = (keySelector) => {
      const groups = new Map();
      sessions.forEach((session) => {
        const key = keySelector(session);
        if (!key) return;
        groups.set(key, [...(groups.get(key) || []), session]);
      });
      return [...groups.entries()]
        .map(([id, items]) => ({ id, ...summarize(items) }))
        .sort((left, right) => right.sessions - left.sessions || left.id.localeCompare(right.id));
    };

    return res.json({
      filters: {
        topic_id: topic_id || null,
        setting_id: setting_id || null,
        scenario_id: scenario_id || null,
        student_id: student_id || null,
        status: status || null,
        start_date: start_date || null,
        end_date: end_date || null,
      },
      totals: {
        ...summarize(sessions),
        completed_sessions: completedSessions.length,
        students: studentIds.length,
      },
      by_topic: groupBy((session) => session.topicId || "legacy-scenarios"),
      by_setting: groupBy(
        (session) => session.settingId || session.scenario?.scenario_id || "unknown"
      ),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Admin Endpoints (Lecturers & Scenario CRUD) ───

app.post("/api/admin/create-lecturer", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  const { name, email, password, gender } = req.body;
  if (!name || !email || !password || !gender) {
    return res.status(400).json({ error: "Name, email, password, and gender are required" });
  }
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    // Generate unique lecturer code
    let code;
    let codeUnique = false;
    let attempts = 0;
    while (!codeUnique && attempts < 10) {
      code = generateLecturerCode(name);
      const isExist = await User.findOne({ lecturerCode: code });
      if (!isExist) codeUnique = true;
      attempts++;
    }

    const lecturer = new User({
      name,
      email,
      password,
      gender,
      role: "lecturer",
      lecturerCode: code
    });
    await lecturer.save();

    res.status(201).json({
      success: true,
      lecturer: {
        id: lecturer._id,
        name: lecturer.name,
        email: lecturer.email,
        gender: lecturer.gender,
        role: lecturer.role,
        lecturerCode: lecturer.lecturerCode
      }
    });
  } catch (err) {
    console.error("Create Lecturer Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/lecturers", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const lecturers = await User.find({ role: "lecturer" }).sort({ createdAt: -1 });
    res.json(lecturers.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      gender: u.gender,
      lecturerCode: u.lecturerCode,
      createdAt: u.createdAt
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/scenarios", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const list = await Scenario.find().sort({ scenarioId: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/scenarios", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  const { scenarioId, title, isActive, data } = req.body;
  if (!scenarioId || !title || !data) {
    return res.status(400).json({ error: "scenarioId, title, and data are required" });
  }
  try {
    const existing = await Scenario.findOne({ scenarioId: scenarioId.toUpperCase() });
    if (existing) {
      return res.status(400).json({ error: `Scenario with ID ${scenarioId} already exists.` });
    }
    const scenario = new Scenario({
      scenarioId: scenarioId.toUpperCase(),
      title,
      version: Number(data?.scenario?.scenario_version || data?.scenario?.version || data?.version || 1),
      isActive: isActive !== false,
      data: attachScenarioVersion(data, Number(data?.scenario?.scenario_version || data?.scenario?.version || data?.version || 1))
    });
    await scenario.save();
    res.status(201).json(scenario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admin/scenarios/:id", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  const { title, isActive, data } = req.body;
  try {
    const scenario = await Scenario.findById(req.params.id);
    if (!scenario) {
      return res.status(404).json({ error: "Scenario not found" });
    }
    if (title !== undefined) scenario.title = title;
    if (isActive !== undefined) scenario.isActive = isActive;
    if (data !== undefined) {
      const nextVersion = Number(data?.scenario?.scenario_version || data?.scenario?.version || data?.version || scenario.version || 1);
      scenario.version = nextVersion;
      scenario.data = attachScenarioVersion(data, nextVersion);
    }
    await scenario.save();
    res.json(scenario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/scenarios/:id", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const result = await Scenario.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: "Scenario not found" });
    }
    res.json({ success: true, message: "Scenario deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin Topic & Setting CRUD Endpoints ───

app.get("/api/admin/topics", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const list = mongoose.connection.readyState === 1
      ? await Topic.find().sort({ displayOrder: 1, title: 1 })
      : topicsData;
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/topics", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  const { topicId, title, description, iconKey, displayOrder, isActive, languageObjectives, iccObjectives } = req.body;
  const validationError = validateTopicInput({ topicId, title });
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const normalizedTopicId = String(topicId).toLowerCase().trim();
    const existing = mongoose.connection.readyState === 1
      ? await Topic.findOne({ topicId: normalizedTopicId })
      : topicsData.find((t) => t.topicId === normalizedTopicId);

    if (existing) {
      return res.status(400).json({ error: `Topic with ID ${normalizedTopicId} already exists.` });
    }

    const topicData = {
      topicId: normalizedTopicId,
      title: String(title).trim(),
      description: description ? String(description).trim() : "",
      iconKey: iconKey ? String(iconKey).trim() : "",
      displayOrder: Number(displayOrder || 0),
      isActive: isActive !== false,
      languageObjectives: Array.isArray(languageObjectives) ? languageObjectives.map(String) : [],
      iccObjectives: Array.isArray(iccObjectives) ? iccObjectives.map(String) : [],
    };

    if (mongoose.connection.readyState === 1) {
      const topic = new Topic(topicData);
      await topic.save();
      return res.status(201).json(topic);
    } else {
      topicsData.push(topicData);
      return res.status(201).json(topicData);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admin/topics/:id", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  const { title, description, iconKey, displayOrder, isActive, languageObjectives, iccObjectives } = req.body;
  const validationError = validateTopicInput({ title }, { requireId: false });
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    if (mongoose.connection.readyState === 1) {
      const topic = await Topic.findById(req.params.id);
      if (!topic) {
        return res.status(404).json({ error: "Topic not found" });
      }
      if (title !== undefined) topic.title = String(title).trim();
      if (description !== undefined) topic.description = String(description).trim();
      if (iconKey !== undefined) topic.iconKey = String(iconKey).trim();
      if (displayOrder !== undefined) topic.displayOrder = Number(displayOrder);
      if (isActive !== undefined) topic.isActive = Boolean(isActive);
      if (languageObjectives !== undefined) topic.languageObjectives = Array.isArray(languageObjectives) ? languageObjectives.map(String) : [];
      if (iccObjectives !== undefined) topic.iccObjectives = Array.isArray(iccObjectives) ? iccObjectives.map(String) : [];

      await topic.save();
      return res.json(topic);
    } else {
      const idx = topicsData.findIndex((t) => t.topicId === req.params.id || t._id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "Topic not found" });
      const t = topicsData[idx];
      if (title !== undefined) t.title = String(title).trim();
      if (description !== undefined) t.description = String(description).trim();
      if (iconKey !== undefined) t.iconKey = String(iconKey).trim();
      if (displayOrder !== undefined) t.displayOrder = Number(displayOrder);
      if (isActive !== undefined) t.isActive = Boolean(isActive);
      if (languageObjectives !== undefined) t.languageObjectives = Array.isArray(languageObjectives) ? languageObjectives.map(String) : [];
      if (iccObjectives !== undefined) t.iccObjectives = Array.isArray(iccObjectives) ? iccObjectives.map(String) : [];
      return res.json(t);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/topics/:id", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const topic = await Topic.findById(req.params.id);
      if (!topic) {
        return res.status(404).json({ error: "Topic not found" });
      }
      const sessionCount = await PracticeSession.countDocuments({ topicId: topic.topicId });
      const settingCount = await Setting.countDocuments({ topicId: topic.topicId });
      if (sessionCount > 0 || settingCount > 0) {
        topic.isActive = false;
        await topic.save();
        await Setting.updateMany(
          { topicId: topic.topicId },
          { $set: { isActive: false, updatedAt: new Date() } }
        );
        return res.json({
          success: true,
          message: `Topic ${topic.topicId} has related settings or sessions; the topic and its settings were archived instead of deleted.`,
          archived: true,
        });
      }
      await Topic.findByIdAndDelete(req.params.id);
      return res.json({ success: true, message: "Topic deleted successfully", archived: false });
    } else {
      const idx = topicsData.findIndex((t) => t.topicId === req.params.id || t._id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "Topic not found" });
      topicsData[idx].isActive = false;
      settingsData.forEach((setting) => {
        if (setting.topicId === topicsData[idx].topicId) setting.isActive = false;
      });
      return res.json({ success: true, message: "Topic and related settings deactivated", archived: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/settings", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  const { topic_id } = req.query;
  try {
    const filter = topic_id ? { topicId: String(topic_id).toLowerCase().trim() } : {};
    const list = mongoose.connection.readyState === 1
      ? await Setting.find(filter).sort({ topicId: 1, displayOrder: 1, title: 1 })
      : settingsData.filter((s) => !topic_id || s.topicId === topic_id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/settings", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  const { settingId, topicId, title, location, briefing, stickerAssetKey, studentRole, aiCharacter, taskInstruction, conversationStages, constraints, rubric, sessionRules, displayOrder, isActive } = req.body;
  const validationError = validateSettingInput(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const normalizedSettingId = String(settingId).toUpperCase().trim();
    const normalizedTopicId = String(topicId).toLowerCase().trim();
    const parentTopic = await findTopicById(normalizedTopicId);
    if (!parentTopic) {
      return res.status(400).json({ error: `Parent topic ${normalizedTopicId} does not exist.` });
    }

    const existing = mongoose.connection.readyState === 1
      ? await Setting.findOne({ settingId: normalizedSettingId })
      : settingsData.find((s) => s.settingId === normalizedSettingId);

    if (existing) {
      return res.status(400).json({ error: `Setting with ID ${normalizedSettingId} already exists.` });
    }

    const settingData = {
      settingId: normalizedSettingId,
      topicId: normalizedTopicId,
      title: String(title).trim(),
      location: String(location).trim(),
      briefing: briefing ? String(briefing).trim() : "",
      stickerAssetKey: stickerAssetKey ? String(stickerAssetKey).trim() : "",
      studentRole: String(studentRole).trim(),
      aiCharacter: {
        display_name: aiCharacter?.display_name || aiCharacter?.displayName || "AI Character",
        role: aiCharacter?.role || "Conversation partner",
        culture: aiCharacter?.culture || "International",
        avatar_key: aiCharacter?.avatar_key || aiCharacter?.avatarKey || "default_avatar",
      },
      taskInstruction: taskInstruction ? String(taskInstruction).trim() : "",
      conversationStages: Array.isArray(conversationStages) ? conversationStages : [],
      constraints: Array.isArray(constraints) ? constraints.map(String) : [],
      rubric: rubric || {},
      sessionRules: normalizeSessionRulesInput(sessionRules),
      displayOrder: Number(displayOrder || 0),
      isActive: isActive !== false,
      version: 1,
    };

    if (mongoose.connection.readyState === 1) {
      const setting = new Setting(settingData);
      await setting.save();
      return res.status(201).json(setting);
    } else {
      settingsData.push(settingData);
      return res.status(201).json(settingData);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admin/settings/:id", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  const { topicId, title, location, briefing, stickerAssetKey, studentRole, aiCharacter, taskInstruction, conversationStages, constraints, rubric, sessionRules, displayOrder, isActive } = req.body;
  const validationError = validateSettingInput(req.body, { requireIdentity: false });
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    if (mongoose.connection.readyState === 1) {
      const setting = await Setting.findById(req.params.id);
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      if (topicId !== undefined) {
        const normalizedTopicId = String(topicId).toLowerCase().trim();
        const parentTopic = await findTopicById(normalizedTopicId);
        if (!parentTopic) {
          return res.status(400).json({ error: `Parent topic ${normalizedTopicId} does not exist.` });
        }
        setting.topicId = normalizedTopicId;
      }
      if (title !== undefined) setting.title = String(title).trim();
      if (location !== undefined) setting.location = String(location).trim();
      if (briefing !== undefined) setting.briefing = String(briefing).trim();
      if (stickerAssetKey !== undefined) setting.stickerAssetKey = String(stickerAssetKey).trim();
      if (studentRole !== undefined) setting.studentRole = String(studentRole).trim();
      if (aiCharacter !== undefined) {
        setting.aiCharacter = {
          display_name: aiCharacter.display_name || aiCharacter.displayName || setting.aiCharacter.display_name,
          role: aiCharacter.role || setting.aiCharacter.role,
          culture: aiCharacter.culture || setting.aiCharacter.culture,
          avatar_key: aiCharacter.avatar_key || aiCharacter.avatarKey || setting.aiCharacter.avatar_key,
        };
      }
      if (taskInstruction !== undefined) setting.taskInstruction = String(taskInstruction).trim();
      if (conversationStages !== undefined) setting.conversationStages = Array.isArray(conversationStages) ? conversationStages : [];
      if (constraints !== undefined) setting.constraints = Array.isArray(constraints) ? constraints.map(String) : [];
      if (rubric !== undefined) setting.rubric = rubric;
      if (sessionRules !== undefined) {
        setting.sessionRules = normalizeSessionRulesInput(sessionRules);
      }
      if (displayOrder !== undefined) setting.displayOrder = Number(displayOrder);
      if (isActive !== undefined) setting.isActive = Boolean(isActive);

      setting.version = (setting.version || 1) + 1;
      await setting.save();
      return res.json(setting);
    } else {
      const idx = settingsData.findIndex((s) => s.settingId === req.params.id || s._id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "Setting not found" });
      const s = settingsData[idx];
      if (topicId !== undefined) {
        const normalizedTopicId = String(topicId).toLowerCase().trim();
        const parentTopic = await findTopicById(normalizedTopicId);
        if (!parentTopic) return res.status(400).json({ error: `Parent topic ${normalizedTopicId} does not exist.` });
        s.topicId = normalizedTopicId;
      }
      if (title !== undefined) s.title = String(title).trim();
      if (location !== undefined) s.location = String(location).trim();
      if (briefing !== undefined) s.briefing = String(briefing).trim();
      if (stickerAssetKey !== undefined) s.stickerAssetKey = String(stickerAssetKey).trim();
      if (studentRole !== undefined) s.studentRole = String(studentRole).trim();
      if (aiCharacter !== undefined) s.aiCharacter = { ...s.aiCharacter, ...aiCharacter };
      if (taskInstruction !== undefined) s.taskInstruction = String(taskInstruction).trim();
      if (conversationStages !== undefined) s.conversationStages = conversationStages;
      if (constraints !== undefined) s.constraints = constraints.map(String);
      if (rubric !== undefined) s.rubric = rubric;
      if (sessionRules !== undefined) s.sessionRules = normalizeSessionRulesInput(sessionRules);
      if (displayOrder !== undefined) s.displayOrder = Number(displayOrder);
      if (isActive !== undefined) s.isActive = Boolean(isActive);
      s.version = Number(s.version || 1) + 1;
      return res.json(s);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/settings/:id", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const setting = await Setting.findById(req.params.id);
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      const sessionCount = await PracticeSession.countDocuments({ settingId: setting.settingId });
      if (sessionCount > 0) {
        setting.isActive = false;
        await setting.save();
        return res.json({ success: true, message: `Setting ${setting.settingId} has existing sessions; archived (deactivated) instead of physical deletion.`, archived: true });
      }
      await Setting.findByIdAndDelete(req.params.id);
      return res.json({ success: true, message: "Setting deleted successfully", archived: false });
    } else {
      const idx = settingsData.findIndex((s) => s.settingId === req.params.id || s._id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "Setting not found" });
      settingsData[idx].isActive = false;
      return res.json({ success: true, message: "Setting deactivated", archived: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Evaluation Endpoint ───

// --- Learning Module and QR Launch Endpoints ---

app.get("/api/admin/modules", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  try {
    return res.json(await buildLearningModuleTree());
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

app.post("/api/admin/modules", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const moduleId = normalizeLearningId(req.body.module_id || req.body.moduleId);
    const validationError = validateLearningId(moduleId, "module_id");
    if (validationError) return res.status(400).json({ error: validationError });
    if (!String(req.body.title || "").trim()) {
      return res.status(400).json({ error: "title is required" });
    }
    if (await LearningModule.exists({ moduleId })) {
      return res.status(409).json({ error: `Module ${moduleId} already exists.` });
    }
    const module = await LearningModule.create({
      moduleId,
      title: String(req.body.title).trim(),
      description: String(req.body.description || "").trim(),
      displayOrder: Number(req.body.display_order || 0),
      isActive: req.body.is_active !== false,
      createdBy: req.user.userId,
    });
    return res.status(201).json(serializeLearningModule(module));
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

app.put("/api/admin/modules/:module_id", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const moduleId = normalizeLearningId(req.params.module_id);
    const update = {};
    if (req.body.title !== undefined) update.title = String(req.body.title).trim();
    if (req.body.description !== undefined) update.description = String(req.body.description).trim();
    if (req.body.display_order !== undefined) update.displayOrder = Number(req.body.display_order);
    if (req.body.is_active !== undefined) update.isActive = Boolean(req.body.is_active);
    if (update.title === "") return res.status(400).json({ error: "title cannot be empty" });
    const module = await LearningModule.findOneAndUpdate(
      { moduleId },
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!module) return res.status(404).json({ error: `Module ${moduleId} was not found.` });
    return res.json(serializeLearningModule(module));
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

app.delete("/api/admin/modules/:module_id", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const moduleId = normalizeLearningId(req.params.module_id);
    const module = await LearningModule.findOneAndUpdate(
      { moduleId },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!module) return res.status(404).json({ error: `Module ${moduleId} was not found.` });
    await Promise.all([
      LearningUnit.updateMany({ moduleId }, { $set: { isActive: false } }),
      LearningPage.updateMany({ moduleId }, { $set: { isActive: false } }),
      LaunchToken.updateMany({ moduleId }, { $set: { isActive: false } }),
    ]);
    return res.json({ success: true, module: serializeLearningModule(module) });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

app.post("/api/admin/modules/:module_id/units", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const moduleId = normalizeLearningId(req.params.module_id);
    const unitId = normalizeLearningId(req.body.unit_id || req.body.unitId);
    const validationError = validateLearningId(unitId, "unit_id");
    if (validationError) return res.status(400).json({ error: validationError });
    if (!String(req.body.title || "").trim()) return res.status(400).json({ error: "title is required" });
    if (!(await LearningModule.exists({ moduleId, isActive: true }))) {
      return res.status(404).json({ error: `Active module ${moduleId} was not found.` });
    }
    if (await LearningUnit.exists({ unitId })) {
      return res.status(409).json({ error: `Unit ${unitId} already exists.` });
    }
    const unit = await LearningUnit.create({
      unitId,
      moduleId,
      title: String(req.body.title).trim(),
      description: String(req.body.description || "").trim(),
      displayOrder: Number(req.body.display_order || 0),
      isActive: req.body.is_active !== false,
    });
    return res.status(201).json(serializeLearningUnit(unit));
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

app.put("/api/admin/units/:unit_id", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const unitId = normalizeLearningId(req.params.unit_id);
    const update = {};
    if (req.body.title !== undefined) update.title = String(req.body.title).trim();
    if (req.body.description !== undefined) update.description = String(req.body.description).trim();
    if (req.body.display_order !== undefined) update.displayOrder = Number(req.body.display_order);
    if (req.body.is_active !== undefined) update.isActive = Boolean(req.body.is_active);
    if (update.title === "") return res.status(400).json({ error: "title cannot be empty" });
    const unit = await LearningUnit.findOneAndUpdate(
      { unitId },
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!unit) return res.status(404).json({ error: `Unit ${unitId} was not found.` });
    if (update.isActive === false) {
      await Promise.all([
        LearningPage.updateMany({ unitId }, { $set: { isActive: false } }),
        LaunchToken.updateMany({ unitId }, { $set: { isActive: false } }),
      ]);
    }
    return res.json(serializeLearningUnit(unit));
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

app.post("/api/admin/units/:unit_id/pages", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const unitId = normalizeLearningId(req.params.unit_id);
    const pageId = normalizeLearningId(req.body.page_id || req.body.pageId);
    const settingId = normalizeLearningId(req.body.setting_id || req.body.settingId);
    const validationError = validateLearningId(pageId, "page_id") || validateLearningId(settingId, "setting_id");
    if (validationError) return res.status(400).json({ error: validationError });
    if (!String(req.body.title || "").trim()) return res.status(400).json({ error: "title is required" });
    const unit = await LearningUnit.findOne({ unitId, isActive: true }).lean();
    if (!unit) return res.status(404).json({ error: `Active unit ${unitId} was not found.` });
    if (!(await Setting.exists({ settingId, isActive: true }))) {
      return res.status(404).json({ error: `Active setting ${settingId} was not found.` });
    }
    if (await LearningPage.exists({ pageId })) {
      return res.status(409).json({ error: `Page ${pageId} already exists.` });
    }
    const page = await LearningPage.create({
      pageId,
      moduleId: unit.moduleId,
      unitId,
      title: String(req.body.title).trim(),
      instructions: String(req.body.instructions || "").trim(),
      settingId,
      displayOrder: Number(req.body.display_order || 0),
      isActive: req.body.is_active !== false,
    });
    return res.status(201).json(serializeLearningPage(page));
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

app.put("/api/admin/pages/:page_id", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const pageId = normalizeLearningId(req.params.page_id);
    const update = {};
    if (req.body.title !== undefined) update.title = String(req.body.title).trim();
    if (req.body.instructions !== undefined) update.instructions = String(req.body.instructions).trim();
    if (req.body.display_order !== undefined) update.displayOrder = Number(req.body.display_order);
    if (req.body.is_active !== undefined) update.isActive = Boolean(req.body.is_active);
    if (req.body.setting_id !== undefined) {
      const settingId = normalizeLearningId(req.body.setting_id);
      if (!(await Setting.exists({ settingId, isActive: true }))) {
        return res.status(404).json({ error: `Active setting ${settingId} was not found.` });
      }
      update.settingId = settingId;
    }
    const page = await LearningPage.findOneAndUpdate(
      { pageId },
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!page) return res.status(404).json({ error: `Page ${pageId} was not found.` });
    if (update.isActive === false) {
      await LaunchToken.updateMany({ pageId }, { $set: { isActive: false } });
    }
    return res.json(serializeLearningPage(page));
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

app.post("/api/admin/pages/:page_id/launch-token", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const pageId = normalizeLearningId(req.params.page_id);
    const page = await LearningPage.findOne({ pageId, isActive: true }).lean();
    if (!page) return res.status(404).json({ error: `Active page ${pageId} was not found.` });
    const [module, unit, setting] = await Promise.all([
      LearningModule.findOne({ moduleId: page.moduleId, isActive: true }).lean(),
      LearningUnit.findOne({ unitId: page.unitId, isActive: true }).lean(),
      Setting.findOne({ settingId: page.settingId, isActive: true }).lean(),
    ]);
    if (!module || !unit || !setting) {
      return res.status(409).json({ error: "Page references inactive module, unit, or setting." });
    }
    const expiresInDays = Math.min(730, Math.max(1, Number(req.body.expires_in_days || 365)));
    const token = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    const launchUri = `orbis://launch?token=${encodeURIComponent(token)}`;
    const launchToken = await LaunchToken.create({
      tokenHash: hashLaunchToken(token),
      tokenPrefix: token.slice(0, 8),
      moduleId: page.moduleId,
      unitId: page.unitId,
      pageId: page.pageId,
      settingId: page.settingId,
      expiresAt,
      createdBy: req.user.userId,
    });
    const qrDataUrl = await QRCode.toDataURL(launchUri, {
      errorCorrectionLevel: "M",
      width: 512,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
    });
    return res.status(201).json({
      id: launchToken._id,
      token,
      token_prefix: launchToken.tokenPrefix,
      launch_uri: launchUri,
      qr_data_url: qrDataUrl,
      expires_at: expiresAt,
      page: serializeLearningPage(page),
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

app.get("/api/admin/launch-tokens", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const tokens = await LaunchToken.find().sort({ createdAt: -1 }).lean();
    return res.json(tokens.map((token) => ({
      id: token._id,
      token_prefix: token.tokenPrefix,
      module_id: token.moduleId,
      unit_id: token.unitId,
      page_id: token.pageId,
      setting_id: token.settingId,
      expires_at: token.expiresAt,
      is_active: token.isActive !== false,
      scan_count: token.scanCount || 0,
      last_scanned_at: token.lastScannedAt,
      created_at: token.createdAt,
    })));
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

app.patch("/api/admin/launch-tokens/:id/deactivate", authenticateJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const token = await LaunchToken.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );
    if (!token) return res.status(404).json({ error: "Launch token was not found." });
    return res.json({ success: true, id: token._id, is_active: false });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

app.post("/api/launch/resolve", async (req, res) => {
  try {
    const token = extractLaunchToken(req.body.token || req.body.code || req.body.launch_uri);
    if (!token) return res.status(400).json({ error: "A launch token is required." });
    const launchToken = await LaunchToken.findOne({
      tokenHash: hashLaunchToken(token),
      isActive: true,
    });
    if (!launchToken) return res.status(404).json({ error: "This QR activity is invalid or inactive." });
    if (new Date(launchToken.expiresAt).getTime() <= Date.now()) {
      launchToken.isActive = false;
      await launchToken.save();
      return res.status(410).json({ error: "This QR activity has expired." });
    }
    const [module, unit, page, setting] = await Promise.all([
      LearningModule.findOne({ moduleId: launchToken.moduleId, isActive: true }).lean(),
      LearningUnit.findOne({ unitId: launchToken.unitId, isActive: true }).lean(),
      LearningPage.findOne({ pageId: launchToken.pageId, isActive: true }).lean(),
      findActiveSetting(launchToken.settingId),
    ]);
    if (!module || !unit || !page || !setting) {
      return res.status(409).json({ error: "The learning activity is currently unavailable." });
    }
    const topic = await findActiveTopic(setting.topicId);
    if (!topic) return res.status(409).json({ error: "The linked topic is currently unavailable." });
    launchToken.scanCount = Number(launchToken.scanCount || 0) + 1;
    launchToken.lastScannedAt = new Date();
    await launchToken.save();
    return res.json({
      success: true,
      launch: {
        launch_source: "module_qr",
        module_id: module.moduleId,
        unit_id: unit.unitId,
        page_id: page.pageId,
      },
      module: serializeLearningModule(module),
      unit: serializeLearningUnit(unit),
      page: serializeLearningPage(page),
      topic: serializeTopic(topic),
      setting: serializeSetting(setting, topic),
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

app.post("/api/chat/respond-turn", async (req, res) => {
  const {
    session_id,
    scenario_id,
    topic_id,
    setting_id,
    turn_number,
    student_response_count,
    conversation_history = [],
    student_response,
    student_display_name,
    student_id,
  } = req.body;

  if ((!scenario_id && !setting_id) || !student_response) {
    return res.status(400).json({
      error: true,
      message: "scenario_id or setting_id, and student_response are required.",
    });
  }

  const resolution = await resolveConversationScenario({
    scenarioId: scenario_id,
    topicId: topic_id,
    settingId: setting_id,
  });
  if (!resolution.scenarioData) {
    return res.status(resolution.status || 400).json({
      error: true,
      message: resolution.error,
    });
  }
  const versionedScenarioData = resolution.scenarioData;

  const responseCount = Number(student_response_count ?? turn_number);
  const normalizedHistory = normalizeConversationHistory(conversation_history);
  const sessionRules = getSessionRules(versionedScenarioData);
  const learnerProfile = {
    displayName: String(student_display_name || "").trim(),
    studentId: String(student_id || "").trim(),
  };

  if (
    !Number.isInteger(responseCount) ||
    responseCount < 1 ||
    responseCount > sessionRules.maximumStudentResponses
  ) {
    return res.status(400).json({
      error: true,
      message: `student_response_count must be an integer between 1 and ${sessionRules.maximumStudentResponses}.`,
    });
  }

  const detectedCategory = detectCategory(student_response, versionedScenarioData);
  const cueDetectedObjectiveIds = detectCompletedObjectives(
    versionedScenarioData,
    normalizedHistory,
    student_response
  );
  let completedObjectiveIds = cueDetectedObjectiveIds;
  const fallbackProgress = buildSessionProgress(
    versionedScenarioData,
    responseCount,
    completedObjectiveIds
  );
  const rules = getSessionRules(versionedScenarioData);
  const shouldUseOpenAI =
    process.env.USE_OPENAI === "true" &&
    Boolean(process.env.OPENAI_API_KEY) &&
    typeof generateChatResponseWithOpenAI === "function";
  let aiMessage = fallbackProgress.session_complete
    ? rules.naturalClosingMessage
    : generateAIMessage(
        detectedCategory,
        versionedScenarioData,
        fallbackProgress.remaining_objective_ids,
        student_response,
        normalizedHistory
      );
  let source = "local_fast_fallback";
  let fallbackReason = shouldUseOpenAI ? null : "openai_not_configured";

  if (shouldUseOpenAI && !fallbackProgress.session_complete) {
    try {
      const chatResult = await withTimeout(
        generateChatResponseWithOpenAI({
          scenarioData: versionedScenarioData,
          studentResponseCount: responseCount,
          conversationHistory: normalizedHistory,
          studentResponse: student_response,
          learnerProfile,
        }),
        Number(process.env.OPENAI_CHAT_TIMEOUT_MS) || 4500,
        "openai_chat_timeout"
      );
      aiMessage = chatResult?.ai_message || aiMessage;
      completedObjectiveIds = normalizeCompletedObjectiveIds(
        versionedScenarioData,
        cueDetectedObjectiveIds,
        chatResult?.completed_objective_ids
      );
      source = "openai_chat";
    } catch (error) {
      console.error("OpenAI chat response error:", error.message);
      fallbackReason = error.message === "openai_chat_timeout"
        ? "openai_chat_timeout"
        : "openai_chat_failed";
    }
  }

  const sessionProgress = buildSessionProgress(
    versionedScenarioData,
    responseCount,
    completedObjectiveIds
  );

  return res.json({
    session_id: String(session_id || ""),
    scenario_id: versionedScenarioData.scenario.scenario_id,
    ...getExperienceMetadata(versionedScenarioData),
    turn_number: responseCount,
    ai_message: cleanAiDialogue(
      sessionProgress.session_complete ? rules.naturalClosingMessage : aiMessage,
      versionedScenarioData,
      learnerProfile
    ),
    detected_category: detectedCategory,
    scores: generateScores(detectedCategory),
    feedback: generateFeedback(detectedCategory, student_response, versionedScenarioData),
    cultural_note: cleanScenarioText(versionedScenarioData.scenario.cultural_note, versionedScenarioData),
    improved_response: generateImprovedResponse(detectedCategory, versionedScenarioData),
    continue_conversation: !sessionProgress.session_complete,
    completed_objective_ids: completedObjectiveIds,
    session_progress: sessionProgress,
    session_memory: buildSessionMemory(
      versionedScenarioData,
      normalizedHistory,
      student_response,
      completedObjectiveIds
    ),
    end_reason: sessionProgress.end_reason,
    source,
    fallback_reason: fallbackReason,
  });
});

app.post("/api/chat/evaluate-turn", async (req, res) => {
  const {
    session_id,
    scenario_id,
    topic_id,
    setting_id,
    turn_number,
    student_response_count,
    conversation_history = [],
    student_response,
    student_display_name,
    student_id,
  } = req.body;

  if ((!scenario_id && !setting_id) || !student_response) {
    return res.status(400).json({
      error: true,
      message: "scenario_id or setting_id, and student_response are required.",
    });
  }

  const resolution = await resolveConversationScenario({
    scenarioId: scenario_id,
    topicId: topic_id,
    settingId: setting_id,
  });
  if (!resolution.scenarioData) {
    return res.status(resolution.status || 400).json({
      error: true,
      message: resolution.error,
    });
  }
  const versionedScenarioData = resolution.scenarioData;

  const responseCount = Number(student_response_count ?? turn_number);
  const normalizedHistory = normalizeConversationHistory(conversation_history);
  const sessionRules = getSessionRules(versionedScenarioData);
  const learnerProfile = {
    displayName: String(student_display_name || "").trim(),
    studentId: String(student_id || "").trim(),
  };

  if (
    !Number.isInteger(responseCount) ||
    responseCount < 1 ||
    responseCount > sessionRules.maximumStudentResponses
  ) {
    return res.status(400).json({
      error: true,
      message: `student_response_count must be an integer between 1 and ${sessionRules.maximumStudentResponses}.`,
    });
  }

  const shouldUseOpenAI =
    process.env.USE_OPENAI === "true" &&
    Boolean(process.env.OPENAI_API_KEY) &&
    typeof evaluateWithOpenAI === "function";
  let fallbackReason = shouldUseOpenAI ? null : "openai_not_configured";

  if (shouldUseOpenAI) {
    try {
      const aiResult = await withTimeout(
        evaluateWithOpenAI({
          scenarioData: versionedScenarioData,
          studentResponseCount: responseCount,
          conversationHistory: normalizedHistory,
          studentResponse: student_response,
          learnerProfile,
        }),
        Number(process.env.OPENAI_EVALUATION_TIMEOUT_MS) || 9000,
        "openai_evaluation_timeout"
      );
      const normalizedResult = normalizeOpenAIResult(
        aiResult,
        String(session_id || ""),
        responseCount,
        student_response,
        versionedScenarioData,
        normalizedHistory,
        learnerProfile
      );

      return res.json({
        ...normalizedResult,
        source: "openai",
      });
    } catch (error) {
      console.error("OpenAI API error:", error.message);
      console.log("Falling back to rule-based evaluator...");
      fallbackReason = error.message === "openai_evaluation_timeout"
        ? "openai_evaluation_timeout"
        : "openai_request_failed";
    }
  }

  const response = buildRuleBasedResponse({
    session_id: String(session_id || ""),
    scenario_id: versionedScenarioData.scenario.scenario_id,
    turn_number: responseCount,
    conversation_history: normalizedHistory,
    student_response,
    scenarioData: versionedScenarioData,
    learnerProfile,
  });

  return res.json({
    ...response,
    source: "local_fallback",
    fallback_reason: fallbackReason,
  });
});

app.post("/api/tts", async (req, res) => {
  const { text, gender, ai_role } = req.body;

  if (!text) {
    return res.status(400).json({
      error: true,
      message: "text parameter is required."
    });
  }

  if (typeof generateTTS !== "function") {
    return res.status(503).json({
      error: true,
      message: "TTS service is currently unavailable."
    });
  }

  try {
    const audioFileName = await generateTTS(text, gender, ai_role);
    const protocol = req.protocol;
    const host = req.get("host");
    const audioUrl = `${protocol}://${host}/audio_cache/${audioFileName}`;

    return res.json({
      success: true,
      audio_url: audioUrl,
      file_name: audioFileName
    });
  } catch (error) {
    console.error("TTS generation error:", error.message);
    return res.status(500).json({
      error: true,
      message: "Failed to generate text-to-speech audio: " + error.message
    });
  }
});

// --- Lecturer Research Endpoints ---

app.get("/api/lecturer/sessions", authenticateJWT, requireRole(["admin", "lecturer"]), async (req, res) => {
  try {
    const { student_id, startDate, endDate, topic_id, setting_id, status, launch_source } = req.query;

    const scope = await resolveLecturerRoster(req.user);
    const requestedFilter = {};
    if (student_id) {
      const ownsStudent = scope.isAdmin || scope.students.some(
        (student) => String(student._id) === String(student_id) || student.studentId === student_id
      );
      if (!ownsStudent) {
        return res.status(403).json({ error: true, message: "Student is not linked to this lecturer." });
      }
      requestedFilter.$or = [
        { userId: student_id },
        { "student.student_id": student_id },
      ];
    }
    if (topic_id) requestedFilter.topicId = topic_id;
    if (setting_id) requestedFilter.settingId = setting_id;
    if (status) requestedFilter.status = status;
    if (launch_source) requestedFilter.launchSource = launch_source;

    if (startDate || endDate) {
      requestedFilter.completedAt = {};
      if (startDate) requestedFilter.completedAt.$gte = new Date(startDate);
      if (endDate) requestedFilter.completedAt.$lte = new Date(endDate);
    }

    const query = combineSessionFilters(
      buildLecturerOwnershipFilter(scope),
      requestedFilter
    );

    let sessions = [];
    if (mongoose.connection.readyState === 1) {
      try {
        sessions = await PracticeSession.find(query).sort({ completedAt: -1 }).lean();
      } catch (_) {}
    }

    return res.json({
      success: true,
      count: sessions.length,
      sessions: (sessions || []).map((s) => ({
        session_id: s.sessionId,
        student_id: s.student?.student_id || "local_student",
        student_name: s.student?.display_name || "Student",
        scenario_id: s.scenario?.scenario_id,
        scenario_title: s.scenario?.title,
        experience_type: s.experienceType || "legacy_scenario",
        topic_id: s.topicId,
        topic_title: s.topicTitle,
        setting_id: s.settingId,
        setting_title: s.settingTitle,
        avatar_key: s.avatarKey,
        launch_source: s.launchSource || "legacy",
        status: s.status,
        overall_score: s.overallScore,
        average_scores: s.averageScores,
        duration_seconds: s.durationSeconds,
        student_response_count: s.studentResponseCount,
        completed_at: s.completedAt,
        coaching_events: s.coachingEvents || [],
        transcript: s.transcript || [],
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
});

app.get("/api/lecturer/analytics", authenticateJWT, requireRole(["admin", "lecturer"]), async (req, res) => {
  try {
    const scope = await resolveLecturerRoster(req.user);
    const query = combineSessionFilters(buildLecturerOwnershipFilter(scope));
    let sessions = [];
    if (mongoose.connection.readyState === 1) {
      try {
        sessions = await PracticeSession.find(query).lean();
      } catch (_) {}
    }

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s) => s.status === "completed").length;
    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    const avgDuration = totalSessions > 0
      ? sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0) / totalSessions
      : 0;

    const avgResponseCount = totalSessions > 0
      ? sessions.reduce((sum, s) => sum + (s.studentResponseCount || 0), 0) / totalSessions
      : 0;

    const overallScoreAvg = totalSessions > 0
      ? sessions.reduce((sum, s) => sum + (s.overallScore || 0), 0) / totalSessions
      : 0;

    const coachingCategories = {};
    sessions.forEach((s) => {
      (s.coachingEvents || []).forEach((c) => {
        if (c?.category) {
          coachingCategories[c.category] = (coachingCategories[c.category] || 0) + 1;
        }
      });
    });

    return res.json({
      success: true,
      total_sessions: totalSessions,
      completed_sessions: completedSessions,
      completion_rate: Math.round(completionRate * 10) / 10,
      average_duration_seconds: Math.round(avgDuration),
      average_response_count: Math.round(avgResponseCount * 10) / 10,
      overall_score_average: Math.round(overallScoreAvg * 100) / 100,
      frequent_coaching_categories: coachingCategories,
    });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
});

app.get("/api/lecturer/export/csv", authenticateJWT, requireRole(["admin", "lecturer"]), async (req, res) => {
  try {
    const scope = await resolveLecturerRoster(req.user, { consentOnly: true });
    const query = combineSessionFilters(buildLecturerOwnershipFilter(scope));
    let sessions = [];
    if (mongoose.connection.readyState === 1) {
      try {
        sessions = await PracticeSession.find(query).lean();
      } catch (_) {}
    }

    const headers = [
      "session_id",
      "student_id",
      "student_name",
      "experience_type",
      "topic_id",
      "setting_id",
      "overall_score",
      "duration_seconds",
      "student_response_count",
      "status",
      "completed_at",
    ];

    const rows = [headers.join(",")];
    sessions.forEach((s) => {
      rows.push([
        `"${s.sessionId || ""}"`,
        `"${s.student?.student_id || ""}"`,
        `"${(s.student?.display_name || "").replace(/"/g, '""')}"`,
        `"${s.experienceType || "legacy"}"`,
        `"${s.topicId || ""}"`,
        `"${s.settingId || ""}"`,
        s.overallScore || 0,
        s.durationSeconds || 0,
        s.studentResponseCount || 0,
        `"${s.status || ""}"`,
        `"${s.completedAt ? new Date(s.completedAt).toISOString() : ""}"`,
      ].join(","));
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="practice_sessions_export.csv"');
    return res.send(rows.join("\n"));
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
});

if (require.main === module) {
  connectDatabase().finally(() => app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  }));
}

module.exports = {
  app,
  buildSessionProgress,
  detectCompletedObjectives,
  buildSessionMemory,
  detectCategory,
  generateAIMessage,
  getSessionRules,
  validateScenarioData,
  normalizePracticeSessionPayload,
  serializePracticeSession,
  normalizeRuntimeContext,
  connectDatabase,
  validateSecurityConfig,
  bootstrapAdmin,
  buildLecturerOwnershipFilter,
  combineSessionFilters,
  Topic,
  Setting,
};
