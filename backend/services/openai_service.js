const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildLearnerPrompt(learnerProfile = {}) {
  const displayName = String(learnerProfile.displayName || "").trim();
  const studentId = String(learnerProfile.studentId || "").trim();

  return `
Learner profile:
- Display name: ${displayName || "the learner"}
- Student ID: ${studentId || "not provided"}

Personalization rules:
- If a display name is provided, you may call the learner by that name naturally.
- Do not overuse the learner's name. Use it mostly in greetings, warm acknowledgements, or closing.
- The learner's real display name replaces any default student character name in the scenario.
`;
}

function buildSystemPrompt(scenarioData, learnerProfile = {}) {
  const scenario = scenarioData.scenario;

  return `
You are the role-play character in an English speaking practice application. You also evaluate silently for the result screen, but you never sound like an evaluator in the conversation.

You are running a role-play scenario for university students learning English intercultural communication.

Scenario identity:
- Scenario ID: ${scenario.scenario_id}
- Title: ${scenario.title}
- Level: ${scenario.level}
- Setting: ${scenario.ar_scene}

Your role:
${scenario.ai_character_prompt}

Student role:
${scenario.student_role}

${buildLearnerPrompt(learnerProfile)}

Characters:
${JSON.stringify(scenarioData.characters || [], null, 2)}

Fixed context and boundaries:
${JSON.stringify(scenarioData.context || {}, null, 2)}

Fixed scenario boundaries:
- Stay inside this scenario only.
- Keep the physical/social setting as: ${scenario.ar_scene}.
- Do not introduce locations, tasks, or roles from other scenarios.
- Speak only as the AI role. Never write the student's dialogue or complete the student's turn.
- Follow every boundary and forbidden term defined in the scenario context.
- If the student gives an answer that moves outside the scenario, gently redirect while staying in character.

Output separation:
- "ai_message" must be only what your role-play character says in the conversation.
- Do not put evaluator feedback, corrections, scores, or suggested expressions inside "ai_message".
- Put teaching comments in "feedback", "cultural_note", and "improved_response".
- "ai_message" must not say "your response", "your meaning", "better to say", "you can say", or similar teacher feedback.
- "ai_message" must not include examples such as "For example..." or quoted improved sentences.
- If the student is too direct, too casual, or slightly rude, stay in character. Respond naturally and briefly, then put the correction only in "feedback" and "improved_response".

Natural conversation behavior:
- Treat short replies such as "yes", "no", "okay", "sure", and "thank you" as normal conversational turns when their meaning is clear from context.
- Acknowledge what the student just said before moving to the next topic.
- Refer naturally to relevant details already mentioned in the session.
- Do not repeat a question that the character asked in the recent conversation.
- Ask at most one clear question in each ai_message.
- Keep ai_message concise and speakable, usually one to three sentences.
- Never announce objectives, stages, categories, scoring, corrections, or session progress.

Scenario:
${JSON.stringify(scenarioData.scenario, null, 2)}

Session rules:
${JSON.stringify(scenarioData.session_rules || {}, null, 2)}

Conversation objectives:
${JSON.stringify(scenarioData.conversation_objectives || [], null, 2)}

Branching rules:
${JSON.stringify(scenarioData.branching_rules, null, 2)}

Rubric:
${JSON.stringify(scenarioData.rubric, null, 2)}

Rules:
- Stay in the role defined above.
- Treat this scenario as context, roles, objectives, constraints, and rubric. Do not follow or recreate any fixed dialogue script.
- If legacy dialogue fields exist in the scenario data, ignore them as a script.
- Evaluate the student's latest response.
- Keep English suitable for the scenario level.
- Do not become a general free chatbot.
- Do not ask unrelated questions.
- Return only valid JSON.
`;
}

function getTurnGuidance(scenarioData, studentResponseCount) {
  const stages = scenarioData.conversation_stages || [];
  const stageIndex = Math.min(
    Math.max(Number(studentResponseCount) - 1, 0),
    Math.max(stages.length - 1, 0)
  );
  const currentStage = stages[stageIndex] || null;

  return `
Student response count: ${studentResponseCount}

Current scenario phase:
${JSON.stringify(currentStage || null, null, 2)}

Session rules:
${JSON.stringify(scenarioData.session_rules || {}, null, 2)}

Conversation objectives:
${JSON.stringify(scenarioData.conversation_objectives || [], null, 2)}

Identify every objective already completed across the full conversation. Generate a natural next message as the AI role from the context and objectives, not from a fixed script. If the target response count has been reached and all required objectives are complete, close the conversation naturally. Keep corrections and examples out of ai_message.
`;
}

function buildPromptMemory(
  scenarioData,
  conversationHistory = [],
  studentResponse = "",
  learnerProfile = {}
) {
  const normalizedHistory = (Array.isArray(conversationHistory)
    ? conversationHistory
    : []
  )
    .map((item) => ({
      speaker:
        String(item?.speaker || "").toLowerCase() === "student"
          ? "Student"
          : "AI",
      message: String(item?.message || "").trim(),
    }))
    .filter((item) => item.message)
    .slice(-12);

  return {
    fixed_context: {
      scenario_id: scenarioData.scenario.scenario_id,
      setting: scenarioData.context.setting,
      student_role: scenarioData.scenario.student_role,
      ai_role: scenarioData.scenario.ai_role,
      boundaries: scenarioData.context.boundaries,
      learner_display_name: learnerProfile.displayName || null,
      learner_student_id: learnerProfile.studentId || null,
    },
    recent_exchanges: normalizedHistory,
    latest_student_response: String(studentResponse || "").trim(),
  };
}

function buildOutputSchema(scenarioData) {
  const objectiveIds = (scenarioData.conversation_objectives || [])
    .map((objective) => objective.objective_id)
    .filter(Boolean);

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      scenario_id: { type: "string" },
      turn_number: { type: "integer" },
      ai_message: { type: "string" },
      detected_category: {
        type: "string",
        enum: [
          "GOOD",
          "ACCEPTABLE",
          "TOO_DIRECT",
          "STEREOTYPING",
          "TOO_PERSONAL",
          "DISMISSIVE",
          "SILENCE_OR_UNCLEAR",
        ],
      },
      scores: {
        type: "object",
        additionalProperties: false,
        properties: {
          grammar: { type: "integer", minimum: 1, maximum: 5 },
          vocabulary: { type: "integer", minimum: 1, maximum: 5 },
          fluency: { type: "integer", minimum: 1, maximum: 5 },
          politeness: { type: "integer", minimum: 1, maximum: 5 },
          pragmatic_appropriateness: {
            type: "integer",
            minimum: 1,
            maximum: 5,
          },
          intercultural_awareness: {
            type: "integer",
            minimum: 1,
            maximum: 5,
          },
        },
        required: [
          "grammar",
          "vocabulary",
          "fluency",
          "politeness",
          "pragmatic_appropriateness",
          "intercultural_awareness",
        ],
      },
      feedback: { type: "string" },
      cultural_note: { type: "string" },
      improved_response: { type: "string" },
      continue_conversation: { type: "boolean" },
      completed_objective_ids: {
        type: "array",
        items: objectiveIds.length
          ? { type: "string", enum: objectiveIds }
          : { type: "string" },
      },
      end_reason: {
        type: ["string", "null"],
        enum: [
          "objectives_completed",
          "maximum_student_responses_reached",
          null,
        ],
      },
    },
    required: [
      "scenario_id",
      "turn_number",
      "ai_message",
      "detected_category",
      "scores",
      "feedback",
      "cultural_note",
      "improved_response",
      "continue_conversation",
      "completed_objective_ids",
      "end_reason",
    ],
  };
}

async function evaluateWithOpenAI({
  scenarioData,
  studentResponseCount,
  conversationHistory,
  studentResponse,
  learnerProfile = {},
}) {
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const scenario = scenarioData.scenario;

  const systemPrompt = buildSystemPrompt(scenarioData, learnerProfile);
  const sessionMemory = buildPromptMemory(
    scenarioData,
    conversationHistory,
    studentResponse,
    learnerProfile
  );

  const userPrompt = `
Current scenario:
${scenario.scenario_id} - ${scenario.title}

Current student response count:
${studentResponseCount}

Turn guidance:
${getTurnGuidance(scenarioData, studentResponseCount)}

Previous conversation:
${JSON.stringify(conversationHistory, null, 2)}

Authoritative session memory:
${JSON.stringify(sessionMemory, null, 2)}

Latest student response:
${studentResponse}

Evaluate the latest student response based on the scenario context, objectives, branching rules, and rubric.
Identify completed objective IDs from the entire conversation, not only the latest response.

Then generate the next AI message as the role-play character.

Respond to the meaning of the latest student turn first. Continue from the recent exchange without resetting the scene, reintroducing the characters, or repeating a recent question.
Use the learner profile for natural name personalization when appropriate.

Remember: ai_message is role-play dialogue only. Feedback and corrections belong in the feedback fields, not in ai_message.
Do not include "For example" or a model sentence in ai_message.

Return only valid JSON using the required output format.
`;

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "intercultural_evaluation",
        schema: buildOutputSchema(scenarioData),
        strict: true,
      },
    },
  });

  return JSON.parse(response.output_text);
}

module.exports = {
  buildPromptMemory,
  buildSystemPrompt,
  evaluateWithOpenAI,
};
