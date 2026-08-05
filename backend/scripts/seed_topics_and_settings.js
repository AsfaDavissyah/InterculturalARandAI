const mongoose = require("mongoose");
const path = require("path");

if (require.main === module) {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
}

const Topic = require("../models/Topic");
const Setting = require("../models/Setting");

const topicsData = [
  {
    topicId: "academic-communication",
    title: "Academic Communication",
    description: "Practice navigating academic consultations, after-class discussions, and respectful communication with lecturers.",
    iconKey: "school",
    displayOrder: 1,
    isActive: true,
    languageObjectives: [
      "Greeting a foreign lecturer",
      "Introducing yourself",
      "Asking questions politely",
      "Requesting clarification",
      "Expressing an opinion respectfully",
      "Ending an academic conversation",
    ],
    iccObjectives: [
      "Formal address",
      "Respectful disagreement",
      "Polite requests",
      "Appropriate student-lecturer distance",
      "Asking for assistance without sounding demanding",
    ],
  },
  {
    topicId: "social-communication",
    title: "Social Communication",
    description: "Practice social interactions in cafes and restaurants in international cities like London and Melbourne.",
    iconKey: "restaurant",
    displayOrder: 2,
    isActive: true,
    languageObjectives: [
      "Ordering food and drinks",
      "Making indirect requests",
      "Asking for recommendations",
      "Asking about payment",
      "Thanking service staff",
    ],
    iccObjectives: [
      "Politeness conventions",
      "Queue culture",
      "Tipping expectations",
      "Appropriate body language",
      "Differences between direct and indirect requests",
    ],
  },
  {
    topicId: "professional-communication",
    title: "Professional Communication",
    description: "Practice formal job interviews and networking conversations at international career events.",
    iconKey: "work",
    displayOrder: 3,
    isActive: true,
    languageObjectives: [
      "Professional self-introduction",
      "Talking about experience",
      "Answering interview questions",
      "Asking the interviewer questions",
      "Closing an interview",
    ],
    iccObjectives: [
      "Eye contact",
      "Confidence without arrogance",
      "Professional etiquette",
      "Humility",
      "International workplace expectations",
    ],
  },
];

const settingsData = [
  // Academic Communication Settings
  {
    settingId: "ACADEMIC-LECTURER-OFFICE",
    topicId: "academic-communication",
    title: "Lecturer's Office Consultation",
    location: "Lecturer's Office",
    briefing: "You are attending a scheduled consultation with your foreign lecturer, Dr Emma Collins. Explain your academic concern, ask for guidance, and close the meeting politely.",
    stickerAssetKey: "sticker_lecturer_office",
    studentRole: "Student attending a scheduled consultation",
    aiCharacter: {
      display_name: "Dr Emma Collins",
      role: "Foreign lecturer",
      culture: "United Kingdom",
      avatar_key: "female_lecturer_v1",
    },
    taskInstruction: "Greet Dr. Collins respectfully, state your academic concern, ask for clarification or guidance, confirm understanding, and close politely.",
    conversationStages: [
      "greeting_and_introduction",
      "stating_academic_concern",
      "requesting_guidance_or_clarification",
      "confirming_understanding",
      "polite_closing",
    ],
    constraints: [
      "Do not use casual greetings or slang like 'sup' or 'hey guys'",
      "Do not demand immediate grade changes or interrupt",
    ],
    rubric: {
      polite_address: 5,
      clear_explanation: 5,
      respectful_request: 5,
    },
    sessionRules: {
      minimumStudentResponses: 5,
      targetStudentResponsesMin: 6,
      targetStudentResponsesMax: 8,
      maximumStudentResponses: 10,
    },
    displayOrder: 1,
    isActive: true,
    version: 1,
  },
  {
    settingId: "ACADEMIC-AFTER-CLASS",
    topicId: "academic-communication",
    title: "After-Class Academic Discussion",
    location: "International Classroom",
    briefing: "Approach Dr Emma Collins right after class to ask a focused question about the recent lecture.",
    stickerAssetKey: "sticker_after_class",
    studentRole: "Student approaching the lecturer after class",
    aiCharacter: {
      display_name: "Dr Emma Collins",
      role: "Lecturer responding to a question about the lesson",
      culture: "United Kingdom",
      avatar_key: "female_lecturer_v1",
    },
    taskInstruction: "Open the conversation appropriately, ask a focused question about the lesson, clarify your understanding, and end politely without taking excessive time.",
    conversationStages: [
      "polite_approach",
      "asking_lecture_question",
      "clarifying_explanation",
      "concise_closing",
    ],
    constraints: [
      "Keep the inquiry concise since class has ended",
      "Use respectful student-lecturer address",
    ],
    rubric: {
      polite_opening: 5,
      focused_question: 5,
      time_awareness: 5,
    },
    sessionRules: {
      minimumStudentResponses: 5,
      targetStudentResponsesMin: 6,
      targetStudentResponsesMax: 8,
      maximumStudentResponses: 10,
    },
    displayOrder: 2,
    isActive: true,
    version: 1,
  },

  // Social Communication Settings
  {
    settingId: "SOCIAL-LONDON-RESTAURANT",
    topicId: "social-communication",
    title: "Restaurant in London",
    location: "London Restaurant",
    briefing: "You are a customer at a restaurant in London. Request a table, ask for recommendations, place your order politely, handle payment, and thank the staff.",
    stickerAssetKey: "sticker_london_restaurant",
    studentRole: "Customer ordering a meal in London",
    aiCharacter: {
      display_name: "Sarah Bennett",
      role: "British restaurant waitress",
      culture: "United Kingdom",
      avatar_key: "waitress_v1",
    },
    taskInstruction: "Request a table or begin ordering, ask Sarah for menu recommendations, make a polite request, handle payment, and thank the waitress.",
    conversationStages: [
      "table_request_and_menu",
      "asking_recommendations",
      "placing_order",
      "payment_and_tipping",
      "closing_thanks",
    ],
    constraints: [
      "Use polite phrasing like 'could I have' or 'I would like'",
      "Do not shout or demand service rudely",
    ],
    rubric: {
      politeness: 5,
      order_clarity: 5,
      cultural_tipping_awareness: 5,
    },
    sessionRules: {
      minimumStudentResponses: 5,
      targetStudentResponsesMin: 6,
      targetStudentResponsesMax: 8,
      maximumStudentResponses: 10,
    },
    displayOrder: 1,
    isActive: true,
    version: 1,
  },
  {
    settingId: "SOCIAL-MELBOURNE-CAFE",
    topicId: "social-communication",
    title: "Cafe in Melbourne",
    location: "Melbourne Cafe",
    briefing: "You are ordering coffee and snacks at a popular Melbourne cafe. Interact with staff member Olivia Reed, place your order, and complete payment.",
    stickerAssetKey: "sticker_melbourne_cafe",
    studentRole: "Customer ordering at a Melbourne cafe",
    aiCharacter: {
      display_name: "Olivia Reed",
      role: "Australian cafe staff member",
      culture: "Australia",
      avatar_key: "barista_v1",
    },
    taskInstruction: "Join the ordering queue, ask about coffee options, place your order naturally, confirm payment, and close politely.",
    conversationStages: [
      "ordering_greeting",
      "asking_options",
      "placing_order",
      "payment_confirmation",
      "friendly_closing",
    ],
    constraints: [
      "Respect queue culture and order promptly",
    ],
    rubric: {
      natural_ordering: 5,
      politeness: 5,
    },
    sessionRules: {
      minimumStudentResponses: 5,
      targetStudentResponsesMin: 6,
      targetStudentResponsesMax: 8,
      maximumStudentResponses: 10,
    },
    displayOrder: 2,
    isActive: true,
    version: 1,
  },

  // Professional Communication Settings
  {
    settingId: "PROFESSIONAL-INTERVIEW-ROOM",
    topicId: "professional-communication",
    title: "Formal Interview Room",
    location: "Formal Interview Room",
    briefing: "You are attending a formal job interview with international HR manager Michael Harris. Introduce yourself, answer interview questions, ask a question, and close professionally.",
    stickerAssetKey: "sticker_interview_room",
    studentRole: "Applicant attending a formal job interview",
    aiCharacter: {
      display_name: "Michael Harris",
      role: "International HR manager",
      culture: "United States",
      avatar_key: "hr_manager_v1",
    },
    taskInstruction: "Introduce yourself professionally, describe relevant experience, answer behavioral questions, ask one useful question, and close professionally.",
    conversationStages: [
      "professional_introduction",
      "explaining_experience",
      "answering_behavioral_questions",
      "asking_interviewer_question",
      "professional_closing",
    ],
    constraints: [
      "Maintain a professional tone and balanced confidence",
    ],
    rubric: {
      professional_introduction: 5,
      experience_articulation: 5,
      interviewer_question: 5,
    },
    sessionRules: {
      minimumStudentResponses: 5,
      targetStudentResponsesMin: 6,
      targetStudentResponsesMax: 8,
      maximumStudentResponses: 10,
    },
    displayOrder: 1,
    isActive: true,
    version: 1,
  },
  {
    settingId: "PROFESSIONAL-CAREER-FAIR",
    topicId: "professional-communication",
    title: "International Career Fair",
    location: "International Career Fair",
    briefing: "Approach Michael Harris at a company booth during an international career fair to pitch your background and ask about opportunities.",
    stickerAssetKey: "sticker_career_fair",
    studentRole: "Student approaching an employer at a career fair",
    aiCharacter: {
      display_name: "Michael Harris",
      role: "HR manager representing an international company",
      culture: "United States",
      avatar_key: "hr_manager_v1",
    },
    taskInstruction: "Start a concise conversation, explain your interests and strengths, ask about an opportunity, and exchange closing remarks.",
    conversationStages: [
      "elevator_pitch_opener",
      "sharing_background_and_interests",
      "inquiring_opportunities",
      "closing_and_networking",
    ],
    constraints: [
      "Keep pitch concise and professional for a career fair setting",
    ],
    rubric: {
      pitch_conciseness: 5,
      engagement: 5,
    },
    sessionRules: {
      minimumStudentResponses: 5,
      targetStudentResponsesMin: 6,
      targetStudentResponsesMax: 8,
      maximumStudentResponses: 10,
    },
    displayOrder: 2,
    isActive: true,
    version: 1,
  },
];

async function seedTopicsAndSettings({
  TopicModel = Topic,
  SettingModel = Setting,
  logger = console,
} = {}) {
  logger.log("Seeding Topics and Settings...");
  let topicsInserted = 0;
  let settingsInserted = 0;

  for (const topic of topicsData) {
    const result = await TopicModel.updateOne(
      { topicId: topic.topicId },
      { $setOnInsert: topic },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    topicsInserted += Number(result.upsertedCount || 0);
  }
  logger.log(
    `Topics ready: ${topicsData.length} (${topicsInserted} inserted).`
  );

  for (const setting of settingsData) {
    const result = await SettingModel.updateOne(
      { settingId: setting.settingId },
      { $setOnInsert: setting },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    settingsInserted += Number(result.upsertedCount || 0);
  }
  logger.log(
    `Settings ready: ${settingsData.length} (${settingsInserted} inserted).`
  );

  return {
    topicsProcessed: topicsData.length,
    topicsInserted,
    settingsProcessed: settingsData.length,
    settingsInserted,
  };
}

if (require.main === module) {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/intercultural_db";
  mongoose
    .connect(uri)
    .then(async () => {
      console.log("Connected to MongoDB for seeding.");
      await seedTopicsAndSettings();
      console.log("Seeding completed.");
      await mongoose.disconnect();
    })
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}

module.exports = {
  seedTopicsAndSettings,
  topicsData,
  settingsData,
};
