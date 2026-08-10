const STAGE_DETAILS = {
  greeting_and_introduction: ["Greet and introduce yourself respectfully", ["good morning", "good afternoon", "hello", "my name", "i am"], "Good morning. How can I help you today?"],
  stating_academic_concern: ["Explain the academic concern clearly", ["assignment", "grade", "course", "project", "difficulty", "concern"], "Could you explain the academic concern you would like to discuss?"],
  requesting_guidance_or_clarification: ["Request guidance or clarification politely", ["could you", "would you", "clarify", "explain", "guidance", "help me"], "Which part would you like me to clarify?"],
  confirming_understanding: ["Confirm what you understood", ["i understand", "so i should", "that means", "to confirm"], "Could you briefly confirm what you will do next?"],
  polite_closing: ["Close the consultation politely", ["thank you", "appreciate", "goodbye", "have a good"], "Is there anything else before we finish?"],
  polite_approach: ["Approach the lecturer politely after class", ["excuse me", "professor", "may i", "do you have a moment"], "Of course. What would you like to ask about the lesson?"],
  asking_lecture_question: ["Ask a focused question about the lecture", ["lecture", "lesson", "topic", "question", "could you explain"], "Which idea from today's lecture would you like to discuss?"],
  clarifying_explanation: ["Clarify and check understanding", ["do you mean", "does that mean", "i understand", "clarify"], "How would you explain that idea in your own words?"],
  concise_closing: ["End the after-class exchange concisely", ["thank you", "that is clear", "i appreciate", "see you"], "Is that clear enough for you to continue?"],
  table_request_and_menu: ["Request a table and menu politely", ["table", "menu", "could we", "could i", "please"], "Certainly. Would you like to see the menu?"],
  asking_recommendations: ["Ask for a food or drink recommendation", ["recommend", "suggest", "popular", "special", "what would you"], "Would you like a recommendation for a meal or a drink?"],
  placing_order: ["Place an order clearly and politely", ["could i have", "i would like", "i'll have", "order", "please"], "What would you like to order?"],
  payment_and_tipping: ["Ask about payment and local tipping practice", ["pay", "card", "cash", "bill", "tip", "service charge"], "Would you like to pay by card or cash?"],
  closing_thanks: ["Thank the service staff and close", ["thank you", "thanks", "lovely", "goodbye"], "Thank you. Is there anything else I can get for you?"],
  ordering_greeting: ["Begin a cafe order naturally", ["hello", "hi", "good morning", "order"], "Hi there. What can I get started for you?"],
  asking_options: ["Ask about available cafe options", ["what kind", "options", "recommend", "milk", "coffee", "snack"], "What sort of coffee or snack are you looking for?"],
  payment_confirmation: ["Confirm the order and payment", ["pay", "card", "cash", "total", "confirm"], "Will that be card or cash?"],
  friendly_closing: ["Close the cafe interaction warmly", ["thank you", "thanks", "have a good", "see you"], "Thanks. Is there anything else before I put that through?"],
  professional_introduction: ["Introduce yourself professionally", ["my name", "i am", "pleased to meet", "thank you for"], "Thank you for coming. Could you introduce yourself briefly?"],
  explaining_experience: ["Describe relevant experience and strengths", ["experience", "worked", "project", "skills", "responsible"], "Which experience best prepared you for this role?"],
  answering_behavioral_questions: ["Answer a behavioral interview question with evidence", ["situation", "task", "action", "result", "example", "team"], "Could you give me a specific example of how you handled a challenge?"],
  asking_interviewer_question: ["Ask the interviewer a useful question", ["could you tell me", "what opportunities", "team", "role", "company"], "What would you like to know about the role or the team?"],
  professional_closing: ["Close the interview professionally", ["thank you", "opportunity", "look forward", "pleasure"], "Do you have any final questions before we conclude?"],
  elevator_pitch_opener: ["Open with a concise professional introduction", ["my name", "i study", "interested", "nice to meet"], "Nice to meet you. What brings you to our booth today?"],
  sharing_background_and_interests: ["Share relevant background and career interests", ["background", "study", "experience", "interest", "skills"], "What kind of work are you most interested in?"],
  inquiring_opportunities: ["Ask about suitable opportunities", ["opportunity", "internship", "position", "opening", "apply"], "What type of opportunity are you hoping to find?"],
  closing_and_networking: ["Close and continue professional networking", ["thank you", "connect", "contact", "linkedin", "follow up"], "Would you like information on how to follow up with us?"],
};

const SETTING_DIALOGUE = {
  "ACADEMIC-LECTURER-OFFICE": {
    opening: "Good morning. Please come in. How can I help you today?",
    closing: "Thank you for coming to see me. I hope the next steps are clear, and you are welcome to ask again if you need help.",
    example: "Good morning, Dr Collins. Could I ask for your guidance about my assignment, please?",
  },
  "ACADEMIC-AFTER-CLASS": {
    opening: "Hello. Do you have a question about today's class?",
    closing: "Thank you for checking. I hope that clarification helps, and I will see you in the next class.",
    example: "Excuse me, Dr Collins. Could I ask a quick question about today's lecture?",
  },
  "SOCIAL-LONDON-RESTAURANT": {
    opening: "Good evening. Welcome. How may I help you?",
    closing: "Thank you for visiting. I hope you enjoy your meal and the rest of your evening.",
    example: "Could I have a table and see the menu, please?",
  },
  "SOCIAL-MELBOURNE-CAFE": {
    opening: "Hi there. What can I get started for you today?",
    closing: "Thanks very much. Your order will be ready shortly. Have a great day.",
    example: "Could I have a flat white, please? What snacks would you recommend?",
  },
  "PROFESSIONAL-INTERVIEW-ROOM": {
    opening: "Good morning. Thank you for coming in today. Could you begin by introducing yourself?",
    closing: "Thank you for your time today. We appreciate your interest in the position and will contact you about the next steps.",
    example: "Good morning. Thank you for the opportunity. My name is Alex, and I am pleased to meet you.",
  },
  "PROFESSIONAL-CAREER-FAIR": {
    opening: "Hello. Welcome to our booth. What brings you to the career fair today?",
    closing: "It was good speaking with you. Please use the information here to follow up, and enjoy the rest of the fair.",
    example: "Hello. I am interested in learning about internship opportunities with your company.",
  },
};

function plain(value) {
  return value && typeof value.toObject === "function" ? value.toObject() : value;
}

function serializeTopic(topic) {
  const item = plain(topic) || {};
  return {
    topic_id: item.topicId,
    title: item.title,
    description: item.description || "",
    icon_key: item.iconKey || "",
    display_order: Number(item.displayOrder || 0),
    language_objectives: item.languageObjectives || [],
    icc_objectives: item.iccObjectives || [],
  };
}

function serializeSetting(setting, topic = null) {
  const item = plain(setting) || {};
  const parent = plain(topic) || {};
  const character = item.aiCharacter || {};
  const rules = item.sessionRules || {};
  const dialogue = SETTING_DIALOGUE[item.settingId];
  return {
    setting_id: item.settingId,
    topic_id: item.topicId,
    title: item.title,
    location: item.location,
    briefing: item.briefing || "",
    sticker_asset_key: item.stickerAssetKey || "",
    avatar_key: character.avatar_key || "default_avatar",
    student_role: item.studentRole,
    ai_character: {
      display_name: character.display_name || "AI Character",
      role: character.role || "Conversation partner",
      culture: character.culture || "International",
      avatar_key: character.avatar_key || "default_avatar",
    },
    task_instruction: item.taskInstruction || "",
    opening_message:
      dialogue?.opening ||
      `Hello. Welcome to ${item.location || "this setting"}. How may I help you?`,
    conversation_stages: item.conversationStages || [],
    constraints: item.constraints || [],
    language_objectives: parent.languageObjectives || [],
    icc_objectives: parent.iccObjectives || [],
    rubric: item.rubric || {},
    session_rules: {
      minimum_student_responses: Number(rules.minimumStudentResponses || 5),
      target_student_responses_min: Number(rules.targetStudentResponsesMin || 6),
      target_student_responses_max: Number(rules.targetStudentResponsesMax || 8),
      maximum_student_responses: Number(rules.maximumStudentResponses || 10),
    },
    version: Number(item.version || 1),
  };
}

function buildGuidedScenarioData(setting, topic) {
  const item = plain(setting) || {};
  const parent = plain(topic) || {};
  const publicSetting = serializeSetting(item, parent);
  const character = publicSetting.ai_character;
  const dialogue = SETTING_DIALOGUE[item.settingId] || {
    opening: `Hello. Welcome to ${item.location}. How may I help you?`,
    closing: "Thank you for speaking with me. I hope our conversation was helpful.",
    example: "Hello. Could you help me, please?",
  };
  const stages = (item.conversationStages || []).map((stage, index) => {
    const stageId = typeof stage === "string" ? stage : stage.stage_id;
    const detail = STAGE_DETAILS[stageId] || [
      String(stageId || "conversation step").replaceAll("_", " "),
      [],
      "Could you tell me a little more?",
    ];
    return {
      stage_id: stageId,
      order: index + 1,
      description: detail[0],
      ai_follow_up: detail[2],
    };
  });
  const objectives = stages.map((stage) => {
    const detail = STAGE_DETAILS[stage.stage_id] || [stage.description, [], stage.ai_follow_up];
    return {
      objective_id: stage.stage_id,
      title: stage.description,
      description: stage.description,
      detection_cues: detail[1],
      ai_follow_up: detail[2],
      required: true,
    };
  });

  return {
    schema_version: "2.0",
    experience_type: "guided_topic",
    topic_id: item.topicId,
    setting_id: item.settingId,
    scenario: {
      scenario_id: item.settingId,
      scenario_version: Number(item.version || 1),
      title: item.title,
      scenario_type: parent.title || "Guided Communication",
      level: "B1-B2",
      ar_scene: item.location,
      student_role: item.studentRole,
      ai_role: `${character.display_name}, ${character.role}`,
      task_instruction: item.taskInstruction,
      learning_goal: item.briefing,
      cultural_focus: (parent.iccObjectives || []).join(", "),
      cultural_note: (parent.iccObjectives || []).join("; "),
      avatar_key: character.avatar_key,
      sticker_asset_key: item.stickerAssetKey || "",
      ai_character_prompt: `You are ${character.display_name}, ${character.role} from ${character.culture}. Remain this person throughout the session. You are physically in ${item.location}. Respond as a natural conversation partner, never as a teacher or evaluator.`,
      good_response_examples: [dialogue.example],
    },
    context: {
      setting: item.location,
      situation: item.briefing,
      boundaries: [
        `The location remains ${item.location} for the entire session.`,
        `The AI remains ${character.display_name}, ${character.role}, for the entire session.`,
        `The learner remains ${item.studentRole}; never assign the learner a fictional name.`,
        "Do not move to another setting, topic, or role.",
        ...(item.constraints || []),
      ],
      forbidden_terms: [],
    },
    characters: [
      { name: "Student", role: "Student learner" },
      { name: character.display_name, role: "AI conversation partner", culture: character.culture },
    ],
    language_objectives: parent.languageObjectives || [],
    icc_objectives: parent.iccObjectives || [],
    conversation_objectives: objectives,
    conversation_stages: stages,
    branching_rules: [
      { student_response_category: "TOO_DIRECT", feedback_focus: "Use an appropriately polite and indirect expression for this context" },
      { student_response_category: "TOO_PERSONAL", feedback_focus: "Respect interpersonal boundaries" },
      { student_response_category: "STEREOTYPING", feedback_focus: "Avoid cultural generalization" },
      { student_response_category: "DISMISSIVE", feedback_focus: "Acknowledge the other person's perspective" },
    ],
    fallback_responses: {
      GOOD: objectives[0]?.ai_follow_up || "Thank you. Could you tell me a little more?",
      ACCEPTABLE: objectives[0]?.ai_follow_up || "Thank you. Could you tell me a little more?",
      TOO_DIRECT: "I understand. Could you tell me a little more about what you need?",
      TOO_PERSONAL: "I would rather keep that private, but we can continue with our conversation here.",
      STEREOTYPING: "Experiences can vary from person to person. What would you like to know about this situation?",
      DISMISSIVE: "I see. Could we look at that concern a little more carefully?",
      SILENCE_OR_UNCLEAR: "I did not quite catch that. Could you say it again?",
    },
    rubric: {
      language_objectives: parent.languageObjectives || [],
      icc_objectives: parent.iccObjectives || [],
      criteria: item.rubric || {},
    },
    session_rules: {
      ...publicSetting.session_rules,
      required_objective_ids: objectives.map((objective) => objective.objective_id),
      natural_closing_message: dialogue.closing,
    },
    initial_conversation_state: {
      ai_opening_message: dialogue.opening,
      completed_objective_ids: [],
    },
  };
}

module.exports = {
  buildGuidedScenarioData,
  serializeSetting,
  serializeTopic,
};
