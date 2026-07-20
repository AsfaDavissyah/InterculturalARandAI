require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const PracticeSession = require("./models/PracticeSession");
const Scenario = require("./models/Scenario");

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || "intercultural_ai_secret_key_2026";

async function seedAdmin() {
  try {
    const adminExists = await User.findOne({ role: "admin" });
    if (adminExists) {
      console.log("Admin account already exists. Skipping seed.");
      return;
    }
    const admin = new User({
      name: "System Admin",
      email: "admin@icc.com",
      password: "Admin123!",
      gender: "male",
      role: "admin",
    });
    await admin.save();
    console.log("Default admin account created successfully: admin@icc.com / Admin123!");
  } catch (err) {
    console.error("Error seeding admin account:", err);
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
    await seedAdmin();
    await seedScenarios();
  } catch (err) {
    console.error("MongoDB Atlas connection error:", err);
  }
}

let evaluateWithOpenAI = null;

try {
  const openAIService = require("./services/openai_service");
  evaluateWithOpenAI = openAIService.evaluateWithOpenAI;
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

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    console.log(`[HTTP] ${req.method} ${req.url}`);
  } else {
    const logBody = { ...req.body };
    if (logBody.password) {
      logBody.password = "[REDACTED]";
    }
    console.log(`[HTTP] ${req.method} ${req.url} - body: ${JSON.stringify(logBody)}`);
  }
  next();
});

const dataDir = path.join(__dirname, "data");
const defaultScenarioId = "G-ICC-008";
const scenarioMap = loadScenarios(dataDir);

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
  try {
    const scenario = await Scenario.findOne({ scenarioId: String(scenarioId || "").toUpperCase() });
    return scenario ? scenario.data : null;
  } catch (err) {
    return null;
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

function scenarioSummary(scenarioData) {
  const scenario = scenarioData.scenario;

  return {
    scenario_id: scenario.scenario_id,
    title: scenario.title,
    scenario_type: scenario.scenario_type,
    level: scenario.level,
    ar_scene: scenario.ar_scene,
    student_role: scenario.student_role,
    ai_role: scenario.ai_role,
    task_instruction: scenario.task_instruction,
  };
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
    studentResponseCount >= rules.targetStudentResponsesMin;
  const sessionComplete = reachedMaximum || (reachedTarget && objectivesCompleted);

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
      ? reachedMaximum
        ? "maximum_student_responses_reached"
        : "objectives_completed"
      : null,
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
    setting: scenarioData.context.setting,
    student_role: scenarioData.scenario.student_role,
    ai_role: scenarioData.scenario.ai_role,
    completed_objective_ids: completedObjectiveIds,
    recent_exchanges: history.slice(-8),
  };
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

function buildRuleBasedResponse({
  session_id,
  scenario_id,
  turn_number,
  conversation_history,
  student_response,
  scenarioData,
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

  return {
    session_id,
    scenario_id,
    turn_number: studentResponseCount,
    ai_message: sessionProgress.session_complete
      ? rules.naturalClosingMessage
      : regularAiMessage,
    detected_category: detectedCategory,
    scores,
    feedback: generateFeedback(detectedCategory, student_response, scenarioData),
    cultural_note: cleanScenarioText(scenarioData.scenario.cultural_note, scenarioData),
    improved_response: generateImprovedResponse(detectedCategory, scenarioData),
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
  conversationHistory
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

  const normalized = {
    ...aiResult,
    session_id: sessionId,
    scenario_id: scenarioData.scenario.scenario_id,
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

  normalized.ai_message = sessionProgress.session_complete
    ? rules.naturalClosingMessage
    : shouldUseFallbackMessage
    ? generateAIMessage(
        detectedCategory,
        scenarioData,
        sessionProgress.remaining_objective_ids,
        studentResponse,
        conversationHistory
      )
    : cleanScenarioText(aiMessage, scenarioData);

  return normalized;
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

function normalizePracticeSessionPayload(rawSession, userId) {
  const student = rawSession.student || {};

  return {
    userId,
    sessionId: rawSession.sessionId || rawSession.session_id,
    scenario: rawSession.scenario || {},
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
  };
}

function serializePracticeSession(session) {
  const data = typeof session.toObject === "function" ? session.toObject() : session;

  return {
    schema_version: 1,
    session_id: data.sessionId,
    student: data.student || {
      student_id: "local_student",
      display_name: null,
    },
    scenario: data.scenario || {},
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
  };
}

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
      consent: true
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
        consent: user.consent
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
        consent: user.consent
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
        consent: user.consent
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
    const list = await Scenario.find({ isActive: true });
    const summaries = list
      .map((item) => scenarioSummary(item.data))
      .sort((left, right) => left.scenario_id.localeCompare(right.scenario_id));
    res.json(summaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/scenarios/:scenario_id", async (req, res) => {
  try {
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

    return res.json(scenario.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Lecturer Endpoints ───

app.get("/api/lecturer/students", authenticateJWT, requireRole(["lecturer"]), async (req, res) => {
  try {
    const lecturer = await User.findById(req.user.userId);
    if (!lecturer || !lecturer.lecturerCode) {
      return res.status(400).json({ error: "Lecturer profile is incomplete." });
    }
    const students = await User.find({
      role: "student",
      studentLecturerCode: lecturer.lecturerCode
    }).sort({ name: 1 });

    res.json(students.map(s => ({
      id: s._id,
      name: s.name,
      email: s.email,
      gender: s.gender,
      studentId: s.studentId,
      consent: s.consent,
      createdAt: s.createdAt
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    const sessions = await PracticeSession.find({ userId: { $in: studentIds } })
      .populate("userId", "name email studentId consent")
      .sort({ completedAt: -1 });

    res.json(sessions.map(s => {
      const serialized = serializePracticeSession(s);
      return {
        ...serialized,
        student_details: s.userId ? {
          name: s.userId.name,
          email: s.userId.email,
          student_id: s.userId.studentId,
          consent: s.userId.consent
        } : null
      };
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
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
      isActive: isActive !== false,
      data
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
    if (data !== undefined) scenario.data = data;
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

// ─── Evaluation Endpoint ───

app.post("/api/chat/evaluate-turn", async (req, res) => {
  const {
    session_id,
    scenario_id,
    turn_number,
    student_response_count,
    conversation_history = [],
    student_response,
  } = req.body;

  if (!scenario_id || !student_response) {
    return res.status(400).json({
      error: true,
      message: "scenario_id and student_response are required.",
    });
  }

  const scenarioDoc = await Scenario.findOne({
    scenarioId: scenario_id.toUpperCase(),
    isActive: true
  });

  if (!scenarioDoc) {
    return res.status(400).json({
      error: true,
      message: `Scenario ${scenario_id} is not supported or active.`,
    });
  }

  const scenarioData = scenarioDoc.data;
  const responseCount = Number(student_response_count ?? turn_number);
  const normalizedHistory = normalizeConversationHistory(conversation_history);
  const sessionRules = getSessionRules(scenarioData);

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
      const aiResult = await evaluateWithOpenAI({
        scenarioData,
        studentResponseCount: responseCount,
        conversationHistory: normalizedHistory,
        studentResponse: student_response,
      });
      const normalizedResult = normalizeOpenAIResult(
        aiResult,
        String(session_id || ""),
        responseCount,
        student_response,
        scenarioData,
        normalizedHistory
      );

      return res.json({
        ...normalizedResult,
        source: "openai",
      });
    } catch (error) {
      console.error("OpenAI API error:", error.message);
      console.log("Falling back to rule-based evaluator...");
      fallbackReason = "openai_request_failed";
    }
  }

  const response = buildRuleBasedResponse({
    session_id: String(session_id || ""),
    scenario_id: scenarioData.scenario.scenario_id,
    turn_number: responseCount,
    conversation_history: normalizedHistory,
    student_response,
    scenarioData,
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
  connectDatabase,
};
