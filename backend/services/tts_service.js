const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const OpenAI = require("openai");

let client;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for TTS generation.");
  }
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const IS_SERVERLESS = Boolean(process.env.VERCEL);
const CACHE_DIR = IS_SERVERLESS
  ? path.join("/tmp", "engora_audio_cache")
  : path.join(__dirname, "..", "public", "audio_cache");
const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getVoiceName(gender, aiRole) {
  const roleLower = normalize(aiRole);
  const genderLower = normalize(gender);

  const roleSuggestsMale =
    roleLower.includes("david") ||
    roleLower.includes("michael") ||
    roleLower.includes("mr.") ||
    /\bmale\b/.test(roleLower) ||
    /\bman\b/.test(roleLower) ||
    /\bboy\b/.test(roleLower);
  const isMale =
    genderLower === "male" ||
    (genderLower !== "female" && roleSuggestsMale);

  if (isMale) {
    if (
      roleLower.includes("david") ||
      roleLower.includes("australia") ||
      roleLower.includes("british") ||
      roleLower.includes("uk") ||
      roleLower.includes("london")
    ) {
      return "fable";
    }
    return "onyx";
  }

  if (
    roleLower.includes("british") ||
    roleLower.includes("uk") ||
    roleLower.includes("australia") ||
    roleLower.includes("london") ||
    roleLower.includes("melbourne")
  ) {
    return "shimmer";
  }
  return "nova";
}

function getCharacterProfile(gender, aiRole) {
  const identity = normalize(aiRole);

  if (identity.includes("emma") || identity.includes("foreign lecturer")) {
    return {
      id: "emma_lecturer",
      voice: "shimmer",
      speed: 0.96,
      persona:
        "Speak as a warm British university lecturer. Sound calm, attentive, professional, and encouraging. Use clear articulation and a measured conversational pace.",
    };
  }

  if (
    identity.includes("sarah") ||
    identity.includes("british restaurant") ||
    identity.includes("waitress")
  ) {
    return {
      id: "sarah_waitress",
      voice: "shimmer",
      speed: 1.02,
      persona:
        "Speak as a friendly British restaurant waitress. Sound welcoming, helpful, and naturally upbeat, with clear service-oriented speech.",
    };
  }

  if (
    identity.includes("olivia") ||
    identity.includes("australian cafe") ||
    identity.includes("barista")
  ) {
    return {
      id: "olivia_barista",
      voice: "shimmer",
      speed: 1.03,
      persona:
        "Speak as a friendly Australian cafe staff member. Sound relaxed, approachable, and politely energetic, with natural conversational rhythm.",
    };
  }

  if (
    identity.includes("michael") ||
    identity.includes("hr manager") ||
    identity.includes("interviewer")
  ) {
    return {
      id: "michael_hr",
      voice: "onyx",
      speed: 0.97,
      persona:
        "Speak as a composed international HR manager. Sound confident, professional, attentive, and supportive, with a steady but expressive interview tone.",
    };
  }

  if (identity.includes("david") || identity.includes("exchange student")) {
    return {
      id: "david_student",
      voice: "fable",
      speed: 1.02,
      persona:
        "Speak as a friendly Australian international student. Sound curious, open, relaxed, and naturally conversational.",
    };
  }

  const voice = getVoiceName(gender, aiRole);
  const isMale =
    normalize(gender) === "male" || ["onyx", "fable"].includes(voice);
  return {
    id: isMale ? "generic_male_partner" : "generic_female_partner",
    voice,
    speed: 1,
    persona:
      "Speak as a natural intercultural conversation partner. Sound attentive, approachable, respectful, and conversational rather than formal or robotic.",
  };
}

function detectSpeechIntent(text) {
  const normalizedText = normalize(text);

  if (
    /\b(goodbye|see you|have a (good|great|nice)|nice (speaking|talking)|thank you for (speaking|coming|your time))\b/.test(
      normalizedText
    )
  ) {
    return "closing";
  }

  if (
    /\b(well done|excellent|great (answer|job|choice)|good (answer|job|point)|that(?:'s| is) (great|good|excellent))\b/.test(
      normalizedText
    )
  ) {
    return "encouragement";
  }

  if (
    /\b(more natural|more appropriate|instead|try saying|you could say|a polite way|better to say|would be clearer)\b/.test(
      normalizedText
    )
  ) {
    return "supportive_correction";
  }

  if (
    /\b(i understand|no problem|that(?:'s| is) okay|take your time|don't worry|do not worry|let me clarify|to clarify)\b/.test(
      normalizedText
    )
  ) {
    return "reassurance";
  }

  if (
    /\b(hello|hi|good morning|good afternoon|good evening|welcome|nice to meet you)\b/.test(
      normalizedText
    )
  ) {
    return "greeting";
  }

  if (
    normalizedText.includes("?") ||
    /^(what|why|when|where|who|how|could|would|can|do|did|are|is|have|tell me)\b/.test(
      normalizedText
    )
  ) {
    return "question";
  }

  return "conversation";
}

const INTENT_INSTRUCTIONS = {
  greeting:
    "Deliver the greeting with genuine warmth and a light welcoming lift. Do not sound overly excited.",
  question:
    "Sound attentive and genuinely curious. Use a subtle natural rise for the question without exaggerating it.",
  encouragement:
    "Sound pleased and encouraging. Add gentle positive energy without sounding childish or theatrical.",
  supportive_correction:
    "Sound patient and constructive. Keep the correction gentle, non-judgmental, and reassuring.",
  reassurance:
    "Sound calm, patient, and reassuring. Use a softer delivery while remaining clear.",
  closing:
    "Give the closing a warm, conclusive cadence. Sound sincere and unhurried.",
  conversation:
    "Use varied, natural conversational intonation with subtle emphasis on important words. Avoid a flat, robotic, or theatrical delivery.",
};

function buildSpeechInstructions(text, gender, aiRole) {
  const profile = getCharacterProfile(gender, aiRole);
  const intent = detectSpeechIntent(text);
  return {
    profile,
    intent,
    instructions: `${profile.persona} ${INTENT_INSTRUCTIONS[intent]} Speak only the supplied text and do not add words, sound effects, or commentary.`,
  };
}

function getTtsModel() {
  return String(process.env.OPENAI_TTS_MODEL || DEFAULT_TTS_MODEL).trim();
}

function supportsSpeechInstructions(model) {
  return !["tts-1", "tts-1-hd"].includes(normalize(model));
}

function getCacheFileName({ text, model, voice, speed, instructions }) {
  const hash = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        text: String(text || "").trim(),
        model,
        voice,
        speed,
        instructions: instructions || "",
      })
    )
    .digest("hex");
  return `${hash}.mp3`;
}

function buildSpeechRequest(text, gender, aiRole, model = getTtsModel()) {
  const cleanText = String(text || "").trim();
  const { profile, intent, instructions } = buildSpeechInstructions(
    cleanText,
    gender,
    aiRole
  );
  const requestInstructions = supportsSpeechInstructions(model)
    ? instructions
    : "";
  const request = {
    model,
    voice: profile.voice,
    input: cleanText,
    speed: profile.speed,
  };
  if (requestInstructions) request.instructions = requestInstructions;

  return {
    request,
    profile,
    intent,
    cacheFileName: getCacheFileName({
      text: cleanText,
      model,
      voice: profile.voice,
      speed: profile.speed,
      instructions: requestInstructions,
    }),
  };
}

async function generateTTS(text, gender, aiRole) {
  if (!String(text || "").trim()) {
    throw new Error("Text is required for TTS generation.");
  }

  const result = await generateTTSBuffer(text, gender, aiRole);
  const fileName = result.fileName;
  const filePath = path.join(CACHE_DIR, fileName);

  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, result.buffer);

  return fileName;
}

async function generateTTSBuffer(text, gender, aiRole) {
  if (!String(text || "").trim()) {
    throw new Error("Text is required for TTS generation.");
  }

  const cleanText = String(text).trim();
  const { request, profile, intent, cacheFileName: fileName } =
    buildSpeechRequest(cleanText, gender, aiRole);
  const filePath = path.join(CACHE_DIR, fileName);

  if (fs.existsSync(filePath)) {
    console.log(
      `TTS cache hit profile=${profile.id} intent=${intent} text="${cleanText.substring(0, 20)}..."`
    );
    return {
      buffer: fs.readFileSync(filePath),
      contentType: "audio/mpeg",
      fileName,
    };
  }

  console.log(
    `Generating TTS model=${request.model} voice=${profile.voice} profile=${profile.id} intent=${intent} text="${cleanText.substring(0, 20)}..."`
  );

  const mp3 = await getClient().audio.speech.create(request);
  const buffer = Buffer.from(await mp3.arrayBuffer());

  return { buffer, contentType: "audio/mpeg", fileName };
}

module.exports = {
  generateTTS,
  generateTTSBuffer,
  getVoiceName,
  getCharacterProfile,
  detectSpeechIntent,
  buildSpeechInstructions,
  buildSpeechRequest,
  getCacheFileName,
  getTtsModel,
  supportsSpeechInstructions,
  CACHE_DIR,
  DEFAULT_TTS_MODEL,
};
