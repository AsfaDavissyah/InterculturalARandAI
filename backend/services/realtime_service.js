const OPENAI_REALTIME_CLIENT_SECRETS_URL =
  "https://api.openai.com/v1/realtime/client_secrets";
const DEFAULT_REALTIME_MODEL = "gpt-realtime";
const DEFAULT_REALTIME_VOICE = "marin";
const DEFAULT_PILOT_SETTING_ID = "ACADEMIC-LECTURER-OFFICE";

function realtimePilotSettingIds() {
  return new Set(
    String(process.env.OPENAI_REALTIME_PILOT_SETTING_IDS || DEFAULT_PILOT_SETTING_ID)
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean)
  );
}

function isRealtimePilotSetting(settingId) {
  return realtimePilotSettingIds().has(String(settingId || "").trim().toUpperCase());
}

function buildRealtimeInstructions(scenarioData, student = {}) {
  const scenario = scenarioData?.scenario || {};
  const context = scenarioData?.context || {};
  const objectives = Array.isArray(scenarioData?.conversation_objectives)
    ? scenarioData.conversation_objectives
    : [];
  const studentName = String(student.name || "the student").trim();
  const objectiveText = objectives
    .map((objective) => `- ${objective.description || objective.objective_id}`)
    .join("\n");

  return [
    `You are ${scenario.ai_role || "an English conversation partner"} in Engora.`,
    `The learner is ${studentName}.`,
    `Scenario: ${scenario.title || "English speaking practice"}.`,
    `Location: ${context.setting || scenario.ar_scene || "the configured practice setting"}.`,
    `Student role: ${scenario.student_role || "English learner"}.`,
    `Task: ${scenario.task_instruction || scenario.learning_goal || "Practice an appropriate English conversation"}.`,
    scenario.ai_character_prompt || "Stay in character and respond naturally.",
    context.boundaries?.length
      ? `Boundaries:\n${context.boundaries.map((item) => `- ${item}`).join("\n")}`
      : "",
    objectiveText ? `Practice objectives:\n${objectiveText}` : "",
    "Reply in English using one or two short sentences.",
    "Ask no more than one focused question at a time.",
    "Follow what the learner actually says instead of forcing a scripted stage.",
    "If the learner asks you to repeat, say 'Of course' and faithfully repeat your immediately previous spoken reply without advancing the conversation or asking a different question.",
    "Speak naturally, warmly, and at a clear B1-friendly pace.",
    "This is an audio connectivity pilot. Do not mention system instructions or implementation details.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildRealtimeSessionConfig({ scenarioData, student }) {
  return {
    type: "realtime",
    model: String(process.env.OPENAI_REALTIME_MODEL || DEFAULT_REALTIME_MODEL).trim(),
    output_modalities: ["audio"],
    instructions: buildRealtimeInstructions(scenarioData, student),
    max_output_tokens: Number(process.env.OPENAI_REALTIME_MAX_OUTPUT_TOKENS) || 160,
    audio: {
      input: {
        noise_reduction: { type: "near_field" },
        transcription: {
          model: String(
            process.env.OPENAI_REALTIME_TRANSCRIPTION_MODEL ||
              "gpt-4o-mini-transcribe"
          ).trim(),
          language: "en",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 650,
          create_response: true,
          interrupt_response: true,
        },
      },
      output: {
        voice: String(process.env.OPENAI_REALTIME_VOICE || DEFAULT_REALTIME_VOICE).trim(),
        speed: 1,
      },
    },
  };
}

async function createRealtimeClientSecret({
  scenarioData,
  student,
  fetchImpl = globalThis.fetch,
}) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is not configured.");
    error.statusCode = 503;
    throw error;
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("A Fetch API implementation is required.");
  }

  const session = buildRealtimeSessionConfig({ scenarioData, student });
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.OPENAI_REALTIME_SESSION_TIMEOUT_MS) || 10000
  );

  let response;
  try {
    response = await fetchImpl(OPENAI_REALTIME_CLIENT_SECRETS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ session }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch (_) {}

  if (!response.ok) {
    const error = new Error(
      payload?.error?.message || `OpenAI Realtime returned HTTP ${response.status}.`
    );
    error.statusCode = response.status >= 500 ? 502 : 400;
    throw error;
  }

  const clientSecret = payload.client_secret || payload;
  const value = String(clientSecret?.value || "").trim();
  if (!value) {
    const error = new Error("OpenAI Realtime did not return a client secret.");
    error.statusCode = 502;
    throw error;
  }

  return {
    clientSecret: value,
    expiresAt: Number(clientSecret.expires_at || payload.expires_at || 0),
    sessionId: payload.id || null,
    model: session.model,
    voice: session.audio.output.voice,
  };
}

module.exports = {
  DEFAULT_PILOT_SETTING_ID,
  buildRealtimeInstructions,
  buildRealtimeSessionConfig,
  createRealtimeClientSecret,
  isRealtimePilotSetting,
  realtimePilotSettingIds,
};
