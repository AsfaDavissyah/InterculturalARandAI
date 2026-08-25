const test = require("node:test");
const assert = require("node:assert/strict");
const { getVoiceName } = require("../services/tts_service");

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
