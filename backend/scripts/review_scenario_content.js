require("dotenv").config();
const mongoose = require("mongoose");
const Scenario = require("../models/Scenario");
const {
  APPROVED_AI_PARTNERS,
  buildRuntimeScenarioData,
  generateDeterministicAdvancedSettings,
  serializeCanonicalScenario,
} = require("../services/canonical_scenario_service");

const REVIEW_VERSION = 1;
const applyChanges = process.argv.includes("--apply");

const contentPlan = {
  "ACADEMIC-AFTER-CLASS": {
    opening: "Hi, do you have a question about today's class?",
    probe: "Which part of the lesson would you like me to explain again?",
    clarify: "How would you explain your current understanding in your own words?",
    closing: "I hope that clears things up. Is there anything else before I go?",
    behavior: "Be helpful but mindful that you only have a few minutes before leaving.",
    safeguards: ["Keep the discussion focused on the recent lesson.", "Do not promise grades or special academic treatment."],
  },
  "ACADEMIC-LECTURER-OFFICE": {
    opening: "Hello, please come in. What would you like to discuss today?",
    probe: "Could you explain the academic concern in a little more detail?",
    clarify: "What kind of guidance would be most useful for you?",
    closing: "That sounds like a reasonable next step. Do you understand what to do next?",
    behavior: "Use a professional, supportive lecturer tone and ask one focused question at a time.",
    safeguards: ["Offer guidance without completing the student's work.", "Do not guarantee grades, extensions, or special treatment."],
  },
  "G-ICC-008": {
    partner: "david-student",
    opening: "Hi, I'm David. Thanks for meeting me at the International Office.",
    probe: "Could you tell me where new students usually go first on campus?",
    clarify: "Is there a local custom or campus habit that would be useful for me to know?",
    closing: "Thanks, that was really helpful. Where should we go next?",
    behavior: "Act curious, friendly, and slightly unfamiliar with the campus while avoiding exaggerated cultural confusion.",
    safeguards: ["Stay near the International Office and the beginning of the campus tour.", "Do not generalize about all Australians or Indonesians."],
  },
  "G-ICC-009": {
    partner: "daniel-lecturer",
    opening: "Hello. What would you like to discuss about your assignment?",
    probe: "How much additional time are you requesting, and why?",
    clarify: "What work have you completed so far?",
    closing: "Thank you for explaining the situation clearly. I will confirm the decision after reviewing it.",
    behavior: "Be empathetic but neutral, and require a clear, reasonable request before considering it.",
    safeguards: ["Do not approve the extension automatically.", "Do not request private medical details beyond what is necessary."],
  },
  "L-ICC-001": {
    partner: "raka-student",
    opening: "I don't think that idea will work for our presentation. We should use my plan instead.",
    probe: "Why do you think your approach would work better?",
    clarify: "Can we combine the strongest part of each idea?",
    closing: "That compromise sounds fair. Let's agree on the next step.",
    behavior: "Communicate directly without being insulting, then become open to negotiation when the learner responds respectfully.",
    safeguards: ["Keep the disagreement about the group presentation.", "Do not portray direct communication as rude or culturally inferior."],
  },
  "L-ICC-002": {
    partner: "raka-student",
    opening: "Hi, I'm Raka, your new roommate. It's nice to meet you.",
    probe: "What are you used to when meeting someone for the first time?",
    clarify: "Are there any roommate habits or boundaries we should discuss?",
    closing: "Great, I think we'll get along well. Thanks for talking with me.",
    behavior: "Be friendly and curious while maintaining normal first-meeting boundaries.",
    safeguards: ["Do not ask about income, marriage, religion, or other sensitive details unless the learner raises them appropriately.", "Do not claim one regional greeting style is correct for everyone."],
  },
  "L-ICC-003": {
    partner: "raka-student",
    opening: "Thanks for inviting me. What food options are available there?",
    probe: "Could we choose somewhere with options that fit my dietary needs?",
    clarify: "How can we check the ingredients or preparation before ordering?",
    closing: "That option works for me. Thanks for asking instead of assuming.",
    behavior: "Explain dietary needs calmly and appreciate respectful questions without turning the exchange into a lecture.",
    safeguards: ["Do not assume dietary choices reveal a person's religion or identity.", "Do not pressure either person to eat or disclose private beliefs."],
  },
  "L-ICC-004": {
    partner: "raka-student",
    opening: "I've been listening to the discussion, but I haven't shared my idea yet.",
    probe: "Could you give me a moment to explain my suggestion?",
    clarify: "How would my idea fit with the rest of the group's plan?",
    closing: "Thanks for including me. I'm comfortable with the plan now.",
    behavior: "Begin reserved but capable, and participate more when invited respectfully.",
    safeguards: ["Do not equate quietness with low ability or lack of preparation.", "Do not stereotype urban or rural students."],
  },
  "L-ICC-006": {
    partner: "raka-student",
    opening: "We usually follow the seniors' plan for this organization activity. What would you like to suggest?",
    probe: "How would your proposal help the members and respect the existing program?",
    clarify: "Could you present the idea politely at our next meeting?",
    closing: "Thank you for explaining it respectfully. We can discuss it with the committee.",
    behavior: "Act as a senior student who values respectful communication but is willing to hear a well-explained proposal.",
    safeguards: ["Do not demand obedience or humiliate the junior member.", "Do not present hierarchy as universal across all Indonesian cultures."],
  },
  "L-ICC-007": {
    partner: "raka-student",
    opening: "That joke made me uncomfortable. I'm not sure what you meant by it.",
    probe: "Could you explain your intention without repeating the hurtful part?",
    clarify: "How could we avoid this misunderstanding next time?",
    closing: "Thanks for apologizing and listening. I appreciate the clarification.",
    behavior: "Express discomfort clearly, accept a sincere repair, and keep the conversation calm.",
    safeguards: ["Do not repeat slurs, insults, or discriminatory joke content.", "Focus on apology and repair rather than blaming an entire region."],
  },
  "M-ICC-010": {
    partner: "david-student",
    opening: "We seem to have different ideas about who should lead and how to divide the work.",
    probe: "What responsibilities do you think each person should take?",
    clarify: "How can we make the deadlines and decision process clear for everyone?",
    closing: "That division feels fair. Let's confirm the responsibilities and deadline.",
    behavior: "Represent an international teammate with different but reasonable teamwork expectations.",
    safeguards: ["Do not make one national teamwork style appear superior.", "Keep the discussion on roles, deadlines, and communication expectations."],
  },
  "N-ICC-005": {
    partner: "david-student",
    opening: "I've noticed some things on campus feel different from Australia. What differences have you noticed?",
    probe: "Could you explain why that practice is important in your experience?",
    clarify: "Do you think this varies between individuals as well as cultures?",
    closing: "Thanks for sharing your perspective. I understand the difference more clearly now.",
    behavior: "Be curious and reflective, compare personal experiences, and avoid speaking for every Australian.",
    safeguards: ["Frame cultural comparisons as personal observations, not universal facts.", "Do not reinforce stereotypes about Australians or Indonesians."],
  },
  "PROFESSIONAL-CAREER-FAIR": {
    opening: "Hello, welcome to our booth. What kind of opportunity are you interested in?",
    probe: "Which skills or experiences would you bring to that role?",
    clarify: "What would you like to know about the position or application process?",
    closing: "Thank you for introducing yourself. You can submit your application through our careers page.",
    behavior: "Be welcoming but concise, as a recruiter speaking with many visitors at a busy career fair.",
    safeguards: ["Do not promise employment or imply that the learner has passed screening.", "Do not ask about protected or overly personal information."],
  },
  "PROFESSIONAL-INTERVIEW-ROOM": {
    opening: "Good morning. Please introduce yourself and tell me why you are interested in this role.",
    probe: "Could you describe a relevant experience and what you learned from it?",
    clarify: "How would you handle a challenge while working with an international team?",
    closing: "Thank you for your time. Do you have one question for me before we finish?",
    behavior: "Conduct a structured but supportive entry-level interview and ask one question at a time.",
    safeguards: ["Do not promise a job offer or disclose a hiring decision.", "Do not ask discriminatory or unrelated personal questions."],
  },
  "SOCIAL-LONDON-RESTAURANT": {
    opening: "Good evening. Welcome. Would you like a table, or are you ready to order?",
    probe: "Would you like a recommendation from today's menu?",
    clarify: "Do you have any dietary requirements I should tell the kitchen about?",
    closing: "Thank you. Here is your receipt, and I hope you enjoyed your meal.",
    behavior: "Use courteous British service English and guide the learner through ordering and payment naturally.",
    safeguards: ["Do not assume dietary needs; ask politely when relevant.", "Keep the interaction appropriate to restaurant service."],
  },
  "SOCIAL-MELBOURNE-CAFE": {
    opening: "Hi there. What can I get started for you today?",
    probe: "What kind of coffee do you usually enjoy?",
    clarify: "Would you like anything to eat, and will you be paying by card?",
    closing: "Perfect, your order will be ready shortly. Thanks!",
    behavior: "Use friendly, natural Australian cafe service English without excessive slang.",
    safeguards: ["Explain unfamiliar menu terms briefly when asked.", "Keep the interaction focused on ordering and payment."],
  },
};

const assessmentCriteria = [
  { criterion: "grammar", weight: 5, description: "Uses clear and sufficiently accurate sentence structures." },
  { criterion: "vocabulary", weight: 5, description: "Chooses vocabulary appropriate to the setting and speaking task." },
  { criterion: "fluency", weight: 5, description: "Maintains understandable delivery and responsive turn-taking." },
  { criterion: "politeness", weight: 5, description: "Uses a respectful tone and suitable level of formality." },
  { criterion: "pragmatic_appropriateness", weight: 5, description: "Uses expressions that fit the roles, purpose, and situation." },
  { criterion: "intercultural_awareness", weight: 5, description: "Shows openness, avoids stereotypes, and responds sensitively to differences." },
];

function getPartner(profileId) {
  return APPROVED_AI_PARTNERS.find((partner) => partner.profile_id === profileId);
}

function validateCoreContent(scenario, partner) {
  const errors = [];
  if (String(scenario.title || "").trim().length < 3) errors.push("title");
  if (String(scenario.briefing || "").trim().length < 20) errors.push("briefing");
  if (String(scenario.studentTask || "").trim().length < 20) errors.push("student task");
  if (String(scenario.studentRole || "").trim().length < 5) errors.push("student role");
  if (!partner?.display_name || !partner?.role) errors.push("AI partner");
  if (String(scenario.practiceLocation || "").trim().length < 2) errors.push("practice location");
  return errors;
}

function buildPrompt(scenario, partner, plan) {
  return [
    `You are ${partner.display_name}, ${partner.role} from ${partner.culture}.`,
    `The setting is ${scenario.practiceLocation}. ${plan.behavior}`,
    `The learner is ${scenario.studentRole}. Their task is: ${scenario.studentTask}`,
    "Respond in natural spoken English using one or two concise sentences per turn.",
    "Stay in character, ask only one relevant question at a time, and let the learner do most of the speaking.",
    "Do not score, correct, grade, or mention the assessment rubric during the conversation.",
  ].join(" ");
}

function buildAdvanced(scenario, partner, plan) {
  const generated = generateDeterministicAdvancedSettings({
    briefing: scenario.briefing,
    student_task: scenario.studentTask,
    student_role: scenario.studentRole,
    practice_location: scenario.practiceLocation,
    ai_partner: partner,
    level: scenario.level,
  });

  return {
    ...generated,
    content_review_version: REVIEW_VERSION,
    learning_goal: scenario.briefing,
    completion_conditions: [
      `The learner completes the main task: ${scenario.studentTask}`,
      "The learner contributes at least five meaningful spoken turns.",
      "The learner closes the interaction appropriately for the setting.",
    ],
    conversation_stages: [
      {
        stage_id: "opening",
        title: "Open the Conversation",
        description: "Begin with a greeting or response appropriate to the relationship and setting.",
        ai_follow_up: plan.opening,
      },
      {
        stage_id: "main_task",
        title: "Complete the Main Task",
        description: scenario.studentTask,
        ai_follow_up: plan.probe,
      },
      {
        stage_id: "clarify_and_respond",
        title: "Clarify and Respond",
        description: "Respond to a follow-up, clarify meaning, and acknowledge the partner's perspective.",
        ai_follow_up: plan.clarify,
      },
      {
        stage_id: "close",
        title: "Close Appropriately",
        description: "Confirm the outcome, express thanks when appropriate, and end naturally.",
        ai_follow_up: plan.closing,
      },
    ],
    constraints: [
      `Remain in the designated setting: ${scenario.practiceLocation}.`,
      `Remain in the assigned role: ${partner.display_name}, ${partner.role}.`,
      ...plan.safeguards,
      "Do not evaluate, grade, or coach the learner inside the role-play response.",
    ],
    boundaries: {
      location: `The interaction remains in ${scenario.practiceLocation}.`,
      role: `The AI remains ${partner.display_name}, ${partner.role} from ${partner.culture}.`,
      student: `The learner remains ${scenario.studentRole}.`,
    },
    assessment_criteria: assessmentCriteria,
    ai_prompt_override: buildPrompt(scenario, partner, plan),
  };
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured.");
  await mongoose.connect(process.env.MONGODB_URI);

  const scenarios = await Scenario.find({}).sort({ scenarioId: 1 });
  const databaseIds = scenarios.map((scenario) => scenario.scenarioId);
  const missingPlans = databaseIds.filter((id) => !contentPlan[id]);
  const unknownPlans = Object.keys(contentPlan).filter((id) => !databaseIds.includes(id));
  if (missingPlans.length || unknownPlans.length) {
    throw new Error(`Content plan mismatch. Missing: ${missingPlans.join(", ") || "none"}; unknown: ${unknownPlans.join(", ") || "none"}.`);
  }

  let reviewed = 0;
  let changed = 0;
  for (const scenario of scenarios) {
    const plan = contentPlan[scenario.scenarioId];
    const partner = plan.partner ? getPartner(plan.partner) : scenario.aiPartner?.toObject?.() || scenario.aiPartner;
    const errors = validateCoreContent(scenario, partner);
    if (errors.length) {
      throw new Error(`${scenario.scenarioId} is missing valid ${errors.join(", ")}.`);
    }

    const alreadyReviewed = scenario.advanced?.content_review_version === REVIEW_VERSION;
    const action = alreadyReviewed ? "PASS" : applyChanges ? "UPDATE" : "REVIEW";
    console.log(`${action} ${scenario.scenarioId} | ${scenario.title} | ${scenario.status} | ${scenario.placements.join("+")}`);
    reviewed += 1;
    if (alreadyReviewed) continue;
    changed += 1;

    if (applyChanges) {
      const nextVersion = Number(scenario.version || 1) + 1;
      scenario.aiPartner = partner;
      scenario.advanced = buildAdvanced(scenario, partner, plan);
      scenario.version = nextVersion;
      const canonical = serializeCanonicalScenario(scenario);
      canonical.version = nextVersion;
      canonical.ai_partner = partner;
      canonical.advanced = scenario.advanced;
      scenario.data = buildRuntimeScenarioData(canonical);
      await scenario.save();
    }
  }

  console.log(`${applyChanges ? "Applied" : "Audited"}: ${reviewed} scenarios; ${changed} ${applyChanges ? "updated" : "require review update"}.`);
}

main()
  .catch((error) => {
    console.error(`Scenario content review failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
