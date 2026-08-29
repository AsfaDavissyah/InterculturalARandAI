const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getVoiceName,
  getCharacterProfile,
  detectSpeechIntent,
  buildSpeechInstructions,
  buildSpeechRequest,
  getCacheFileName,
  getTtsModel,
  supportsSpeechInstructions,
  DEFAULT_TTS_MODEL,
} = require("../services/tts_service");

test("TTS voice selection for Melbourne Cafe and Interview Room characters", async (t) => {
  await t.test("Melbourne Cafe (Olivia Reed) gets a female voice (shimmer)", () => {
    const voice = getVoiceName("female", "Olivia Reed (Australian cafe staff member)");
    assert.equal(voice, "shimmer");
  });

  await t.test("Interview Room (Michael Harris) gets a male voice (onyx)", () => {
    const voice = getVoiceName("male", "Michael Harris (International HR manager)");
    assert.equal(voice, "onyx");
  });

  await t.test("Career Fair (Michael Harris) gets a male voice (onyx)", () => {
    const voice = getVoiceName("male", "Michael Harris (HR manager representing an international company)");
    assert.equal(voice, "onyx");
  });

  await t.test("London Restaurant (Sarah Bennett) gets a female voice (shimmer)", () => {
    const voice = getVoiceName("female", "Sarah Bennett (British restaurant waitress)");
    assert.equal(voice, "shimmer");
  });

  await t.test("Lecturer Consultation (Dr Emma Collins) gets a female voice (nova or shimmer)", () => {
    const voice = getVoiceName("female", "Dr Emma Collins (Foreign lecturer)");
    assert.ok(["nova", "shimmer"].includes(voice), `Expected female voice, got ${voice}`);
  });

  await t.test("Exchange Student (David) gets a male voice (fable)", () => {
    const voice = getVoiceName("male", "David, an exchange student from Melbourne, Australia");
    assert.equal(voice, "fable");
  });

  await t.test("explicit female gender wins over stale male role metadata", () => {
    const voice = getVoiceName("female", "Michael Harris (Melbourne cafe staff)");
    assert.equal(voice, "shimmer");
  });

  await t.test("explicit male gender wins over stale female role metadata", () => {
    const voice = getVoiceName("male", "Olivia Reed (Australian cafe staff member)");
    assert.equal(voice, "fable");
  });
});

test("Tone Engine maps guided characters to stable expressive profiles", async (t) => {
  const cases = [
    {
      gender: "female",
      role: "Dr Emma Collins (Foreign lecturer)",
      id: "emma_lecturer",
      voice: "shimmer",
    },
    {
      gender: "female",
      role: "Sarah Bennett (British restaurant waitress)",
      id: "sarah_waitress",
      voice: "shimmer",
    },
    {
      gender: "female",
      role: "Olivia Reed (Australian cafe staff member)",
      id: "olivia_barista",
      voice: "shimmer",
    },
    {
      gender: "male",
      role: "Michael Harris (International HR manager)",
      id: "michael_hr",
      voice: "onyx",
    },
    {
      gender: "male",
      role: "David, an exchange student from Australia",
      id: "david_student",
      voice: "fable",
    },
  ];

  for (const item of cases) {
    await t.test(item.id, () => {
      const profile = getCharacterProfile(item.gender, item.role);
      assert.equal(profile.id, item.id);
      assert.equal(profile.voice, item.voice);
      assert.ok(profile.persona.length > 40);
      assert.ok(profile.speed >= 0.9 && profile.speed <= 1.1);
    });
  }
});

test("Tone Engine detects conversational intent without an extra AI call", () => {
  assert.equal(detectSpeechIntent("Good morning. Welcome to my office."), "greeting");
  assert.equal(detectSpeechIntent("Could you tell me about your experience?"), "question");
  assert.equal(detectSpeechIntent("Excellent, that is a very good answer."), "encouragement");
  assert.equal(detectSpeechIntent("A more natural way would be to say please."), "supportive_correction");
  assert.equal(detectSpeechIntent("Don't worry. Take your time."), "reassurance");
  assert.equal(detectSpeechIntent("Thank you for your time. Have a great day."), "closing");
  assert.equal(detectSpeechIntent("I work with the international student team."), "conversation");
});

test("Tone Engine instructions combine character persona and turn intent", () => {
  const result = buildSpeechInstructions(
    "Could you tell me more about that?",
    "female",
    "Dr Emma Collins (Foreign lecturer)"
  );

  assert.equal(result.profile.id, "emma_lecturer");
  assert.equal(result.intent, "question");
  assert.match(result.instructions, /British university lecturer/i);
  assert.match(result.instructions, /genuinely curious/i);
  assert.match(result.instructions, /do not add words/i);
});

test("Tone Engine cache key changes with model, persona, or instructions", () => {
  const base = {
    text: "Welcome to the interview.",
    model: "gpt-4o-mini-tts",
    voice: "onyx",
    speed: 0.97,
    instructions: "Sound welcoming.",
  };

  const first = getCacheFileName(base);
  assert.match(first, /^[a-f0-9]{64}\.mp3$/);
  assert.equal(first, getCacheFileName({ ...base }));
  assert.notEqual(first, getCacheFileName({ ...base, instructions: "Sound serious." }));
  assert.notEqual(first, getCacheFileName({ ...base, model: "tts-1" }));
  assert.notEqual(first, getCacheFileName({ ...base, voice: "fable" }));
});

test("Tone Engine defaults to an instruction-capable model but supports legacy override", () => {
  const previousModel = process.env.OPENAI_TTS_MODEL;
  delete process.env.OPENAI_TTS_MODEL;
  try {
    assert.equal(getTtsModel(), DEFAULT_TTS_MODEL);
    assert.equal(supportsSpeechInstructions(getTtsModel()), true);
    assert.equal(supportsSpeechInstructions("tts-1"), false);
    assert.equal(supportsSpeechInstructions("tts-1-hd"), false);
  } finally {
    if (previousModel === undefined) delete process.env.OPENAI_TTS_MODEL;
    else process.env.OPENAI_TTS_MODEL = previousModel;
  }
});

test("Tone Engine builds an expressive request and a safe legacy request", () => {
  const expressive = buildSpeechRequest(
    "Welcome. Could you tell me about yourself?",
    "male",
    "Michael Harris (International HR manager)",
    "gpt-4o-mini-tts"
  );
  assert.equal(expressive.request.model, "gpt-4o-mini-tts");
  assert.equal(expressive.request.voice, "onyx");
  assert.equal(expressive.profile.id, "michael_hr");
  assert.equal(expressive.intent, "greeting");
  assert.match(expressive.request.instructions, /international HR manager/i);

  const legacy = buildSpeechRequest(
    "Welcome to the interview.",
    "male",
    "Michael Harris (International HR manager)",
    "tts-1"
  );
  assert.equal(legacy.request.model, "tts-1");
  assert.equal(Object.hasOwn(legacy.request, "instructions"), false);
  assert.notEqual(expressive.cacheFileName, legacy.cacheFileName);
});
