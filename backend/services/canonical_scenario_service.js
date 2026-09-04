const APPROVED_AI_PARTNERS = [
  {
    profile_id: "emma-lecturer",
    display_name: "Dr Emma Collins",
    role: "Foreign Lecturer",
    culture: "United Kingdom",
    avatar_key: "female_lecturer_v1",
    voice_profile: "female",
  },
  {
    profile_id: "sarah-waitress",
    display_name: "Sarah Bennett",
    role: "Restaurant Server",
    culture: "United Kingdom",
    avatar_key: "female_waitress_v1",
    voice_profile: "female",
  },
  {
    profile_id: "olivia-barista",
    display_name: "Olivia Reed",
    role: "Cafe Barista",
    culture: "Australia",
    avatar_key: "female_barista_v1",
    voice_profile: "female",
  },
  {
    profile_id: "michael-hr",
    display_name: "Michael Harris",
    role: "HR Interviewer",
    culture: "United States",
    avatar_key: "male_recruiter_v1",
    voice_profile: "male",
  },
  {
    profile_id: "david-student",
    display_name: "David",
    role: "International Student",
    culture: "Australia",
    avatar_key: "male_student_v1",
    voice_profile: "male",
  },
  {
    profile_id: "raka-student",
    display_name: "Raka Pratama",
    role: "University Student",
    culture: "Indonesia",
    avatar_key: "male_student_v1",
    voice_profile: "male",
  },
  {
    profile_id: "daniel-lecturer",
    display_name: "Dr Daniel Moore",
    role: "Foreign Lecturer",
    culture: "United Kingdom",
    avatar_key: "male_lecturer_v1",
    voice_profile: "male",
  },
];

function getApprovedAiPartner(profileId) {
  return APPROVED_AI_PARTNERS.find((p) => p.profile_id === profileId) || null;
}

function generateDeterministicAdvancedSettings(data = {}) {
  const briefing = (data.briefing || "").trim();
  const task = (data.student_task || data.taskInstruction || "").trim();
  const studentRole = (data.student_role || data.studentRole || "Student").trim();
  const location = (data.practice_location || data.location || "Campus").trim();
  const partner = data.ai_partner || {};
  const partnerName = partner.display_name || partner.role || "AI Partner";
  const partnerRole = partner.role || "Conversation Partner";
  const partnerCulture = partner.culture || "International";

  const learningGoal = briefing || `Practice intercultural spoken communication in ${location} with ${partnerName}.`;

  const stages = [
    {
      stage_id: "greeting_and_opener",
      title: "Greeting and Opening",
      description: "Greet politely and open the interaction appropriately for the setting.",
      ai_follow_up: `Hello! Welcome to ${location}. How can I help you today?`,
    },
    {
      stage_id: "stating_intent_or_question",
      title: "Main Task & Information Exchange",
      description: task || "State your request, questions, or perspectives clearly and politely.",
      ai_follow_up: "Could you tell me a little more about that?",
    },
    {
      stage_id: "clarification_and_depth",
      title: "Clarification & Nuance",
      description: "Respond to questions, clarify meaning, and maintain intercultural awareness.",
      ai_follow_up: "That makes sense. Is there anything specific you would like to clarify?",
    },
    {
      stage_id: "polite_closing",
      title: "Polite Conclusion",
      description: "Express gratitude and close the conversation naturally.",
      ai_follow_up: "Thank you for speaking with me today. Have a great day!",
    },
  ];

  const completionConditions = [
    `Student addresses the speaking task: ${task || "Main goal"}`,
    "Student completes at least 5 meaningful spoken turns.",
    "Student uses respectful and situation-appropriate English.",
  ];

  const constraints = [
    `Remain in the designated setting: ${location}.`,
    `Do not abruptly change the core scenario topic or role.`,
  ];

  const boundaries = {
    location: `The interaction is set in ${location}.`,
    role: `The AI is ${partnerName} (${partnerRole} from ${partnerCulture}).`,
    student: `The learner is ${studentRole}.`,
  };

  const words = (task + " " + briefing)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !["this", "that", "with", "from", "your", "have", "will", "would"].includes(w));
  const uniqueKeywords = Array.from(new Set(words)).slice(0, 8);

  const detectionCues = uniqueKeywords.length > 0 ? uniqueKeywords : ["hello", "could you", "thank you", "please"];

  const assessmentCriteria = [
    { criterion: "grammar", weight: 5, description: "Accuracy and sentence structure clarity." },
    { criterion: "vocabulary", weight: 5, description: "Appropriate range and lexical choice for the situation." },
    { criterion: "fluency", weight: 5, description: "Smooth delivery and turn-taking flow." },
    { criterion: "politeness", weight: 5, description: "Respectful tone, etiquette, and register." },
    { criterion: "pragmatic_appropriateness", weight: 5, description: "Suitability of expressions to context." },
    { criterion: "intercultural_awareness", weight: 5, description: "Sensitivity to cultural nuances." },
  ];

  return {
    learning_goal: learningGoal,
    completion_conditions: completionConditions,
    conversation_stages: stages,
    constraints: constraints,
    boundaries: boundaries,
    detection_cues: detectionCues,
    assessment_criteria: assessmentCriteria,
    ai_prompt_override: null,
  };
}

function buildRuntimeScenarioData(canonical) {
  const item = canonical || {};
  const partner = item.ai_partner || {};
  const rules = item.session_rules || {};
  const advanced = item.advanced || {};
  const stages = advanced.conversation_stages || [];

  const objectives = stages.map((stage, idx) => ({
    objective_id: stage.stage_id || `stage_${idx + 1}`,
    title: stage.title || stage.description || `Step ${idx + 1}`,
    description: stage.description || stage.title || `Step ${idx + 1}`,
    detection_cues: advanced.detection_cues || [],
    ai_follow_up: stage.ai_follow_up || "Thank you. Could you share more details?",
    required: true,
  }));

  const rubricCriteria = {};
  if (Array.isArray(advanced.assessment_criteria)) {
    for (const crit of advanced.assessment_criteria) {
      rubricCriteria[crit.criterion] = crit.weight || 5;
    }
  }

  const promptOverride = advanced.ai_prompt_override;
  const standardPrompt = `You are ${partner.display_name || "an assistant"}, ${partner.role || "a partner"} from ${partner.culture || "International"}. You are in ${item.practice_location || "Campus"}. Respond naturally and concisely in spoken English (1-2 sentences). Do not evaluate or grade the user.`;

  return {
    schema_version: "2.0",
    version: Number(item.version || 1),
    scenario: {
      scenario_id: item.scenario_id,
      scenario_version: Number(item.version || 1),
      title: item.title,
      scenario_type: item.category_ids && item.category_ids[0] ? item.category_ids[0] : "General Practice",
      level: item.level || "B1",
      ar_scene: item.practice_location,
      student_role: item.student_role,
      ai_role: `${partner.display_name || "AI Partner"}, ${partner.role || "Conversation Partner"}`,
      task_instruction: item.student_task,
      learning_goal: advanced.learning_goal || item.briefing,
      avatar_key: partner.avatar_key || "default_avatar",
      sticker_asset_key: item.visual?.sticker_asset_key || "",
      ai_character_prompt: promptOverride || standardPrompt,
      good_response_examples: ["Hello, nice to meet you. Could I ask for your assistance?"],
    },
    context: {
      setting: item.practice_location,
      situation: item.briefing,
      boundaries: [
        advanced.boundaries?.location || `Location remains ${item.practice_location}.`,
        advanced.boundaries?.role || `AI remains ${partner.display_name || partner.role}.`,
        advanced.boundaries?.student || `Student remains ${item.student_role}.`,
        ...(advanced.constraints || []),
      ],
      forbidden_terms: [],
    },
    characters: [
      { name: "Student", role: item.student_role },
      { name: partner.display_name || "AI", role: partner.role, culture: partner.culture },
    ],
    conversation_objectives: objectives,
    conversation_stages: stages,
    branching_rules: [
      { student_response_category: "TOO_DIRECT", feedback_focus: "Use a softer, polite expression." },
      { student_response_category: "TOO_PERSONAL", feedback_focus: "Respect boundaries." },
      { student_response_category: "STEREOTYPING", feedback_focus: "Avoid generalizations." },
      { student_response_category: "DISMISSIVE", feedback_focus: "Acknowledge the partner's points." },
    ],
    fallback_responses: {
      GOOD: "Thank you. Let's continue.",
      ACCEPTABLE: "I understand. Could you tell me a little more?",
      TOO_DIRECT: "I see. Could you explain what you mean in more detail?",
      TOO_PERSONAL: "I'd prefer not to discuss that right now.",
      STEREOTYPING: "People are unique, but let's focus on our situation here.",
      DISMISSIVE: "I see your perspective. How should we proceed?",
      SILENCE_OR_UNCLEAR: "Sorry, I didn't catch that. Could you say it again?",
    },
    rubric: {
      criteria: rubricCriteria,
    },
    session_rules: {
      minimum_student_responses: Number(rules.minimum_student_responses || 5),
      target_student_responses_min: Number(rules.target_student_responses_min || 6),
      target_student_responses_max: Number(rules.target_student_responses_max || 8),
      maximum_student_responses: Number(rules.maximum_student_responses || 10),
      target_duration_minutes: Number(rules.target_duration_minutes || 5),
      required_objective_ids: objectives.map((o) => o.objective_id),
      natural_closing_message: `Thank you for speaking with me today at ${item.practice_location}.`,
    },
    initial_conversation_state: {
      ai_opening_message: `Hello! Welcome to ${item.practice_location}. How can I help you today?`,
      completed_objective_ids: [],
    },
  };
}

function serializeCanonicalScenario(doc) {
  if (!doc) return null;
  const item = typeof doc.toObject === "function" ? doc.toObject() : doc;

  const legacyData = item.data || {};
  const legacyScenario = legacyData.scenario || {};

  const scenarioId = item.scenarioId || item.scenario_id || legacyScenario.scenario_id;
  const title = item.title || legacyScenario.title || "Untitled Scenario";
  const status = item.status || (item.isActive !== false ? "published" : "inactive");
  const placements = item.placements && item.placements.length > 0
    ? item.placements
    : (item.topicId || item.topic_id || item.legacy_refs?.topic_id)
      ? ["guided_topics"]
      : ["scenario_library"];

  const storedCategoryIds = item.category_ids || item.categoryIds;
  const categoryIds = storedCategoryIds && storedCategoryIds.length > 0
    ? storedCategoryIds
    : (item.topicId || item.topic_id || item.legacy_refs?.topic_id)
      ? [String(item.topicId || item.topic_id || item.legacy_refs?.topic_id).toLowerCase()]
      : [];

  const briefing = item.briefing || legacyData.context?.situation || legacyScenario.learning_goal || "";
  const studentRole = item.student_role || item.studentRole || legacyScenario.student_role || "Student";
  const studentTask = item.student_task || item.taskInstruction || legacyScenario.task_instruction || "";
  const practiceLocation = item.practice_location || item.location || legacyScenario.ar_scene || legacyData.context?.setting || "Campus";
  const level = item.level || legacyScenario.level || "B1";

  let aiPartner = item.ai_partner || item.aiPartner || null;
  if (!aiPartner && (item.aiCharacter || legacyScenario.ai_role)) {
    const char = item.aiCharacter || {};
    aiPartner = {
      profile_id: char.avatar_key || "emma-lecturer",
      display_name: char.display_name || legacyScenario.ai_role?.split(",")[0]?.trim() || "Dr Emma Collins",
      role: char.role || legacyScenario.ai_role?.split(",")[1]?.trim() || "Foreign Lecturer",
      culture: char.culture || "United Kingdom",
      avatar_key: char.avatar_key || legacyScenario.avatar_key || "female_lecturer_v1",
      voice_profile: char.voice_profile || "female",
    };
  }
  if (!aiPartner) {
    aiPartner = APPROVED_AI_PARTNERS[0];
  }

  const sessionRules = item.session_rules || item.sessionRules || {
    target_duration_minutes: Number(item.sessionRules?.targetDurationMinutes || 5),
    minimum_student_responses: Number(item.sessionRules?.minimumStudentResponses || legacyData.session_rules?.minimum_student_responses || 5),
    target_student_responses_min: Number(item.sessionRules?.targetStudentResponsesMin || legacyData.session_rules?.target_student_responses_min || 6),
    target_student_responses_max: Number(item.sessionRules?.targetStudentResponsesMax || legacyData.session_rules?.target_student_responses_max || 8),
    maximum_student_responses: Number(item.sessionRules?.maximumStudentResponses || legacyData.session_rules?.maximum_student_responses || 10),
  };

  const advanced = item.advanced || generateDeterministicAdvancedSettings({
    briefing,
    student_task: studentTask,
    student_role: studentRole,
    practice_location: practiceLocation,
    ai_partner: aiPartner,
    level,
  });

  const owner = item.owner || {
    type: "admin",
    user_id: null,
    display_name: "System Admin",
  };

  const legacyRefs = item.legacy_refs || item.legacyRefs || {
    experience_type: legacyData.experience_type || (categoryIds.length > 0 ? "guided_topic" : "legacy_scenario"),
    topic_id: categoryIds[0] || null,
    setting_id: item.settingId || null,
    scenario_id: item.scenarioId || null,
  };

  return {
    scenario_id: scenarioId,
    title: title,
    briefing: briefing,
    placements: placements,
    category_ids: categoryIds,
    status: status,
    owner: owner,
    student_role: studentRole,
    ai_partner: aiPartner,
    student_task: studentTask,
    practice_location: practiceLocation,
    level: level,
    visual: item.visual || {
      sticker_asset_key: item.stickerAssetKey || legacyScenario.sticker_asset_key || "",
    },
    session_rules: sessionRules,
    advanced: advanced,
    version: Number(item.version || 1),
    legacy_refs: legacyRefs,
    created_at: item.createdAt || item.created_at || new Date().toISOString(),
    updated_at: item.updatedAt || item.updated_at || new Date().toISOString(),
    archived_at: item.archivedAt || item.archived_at || null,
    review: item.review || {
      submittedAt: null,
      submittedBy: null,
      reviewedAt: null,
      reviewedBy: null,
      decision: null,
      comment: "",
    },
  };
}

module.exports = {
  APPROVED_AI_PARTNERS,
  getApprovedAiPartner,
  generateDeterministicAdvancedSettings,
  buildRuntimeScenarioData,
  serializeCanonicalScenario,
};
