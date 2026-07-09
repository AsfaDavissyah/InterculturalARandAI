const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CACHE_DIR = path.join(__dirname, "..", "public", "audio_cache");

// Pastikan folder cache ada
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Mendapatkan suara OpenAI berdasarkan gender dan peran/aksen karakter
 * @param {string} gender 
 * @param {string} aiRole
 * @returns {string} nama voice OpenAI
 */
function getVoiceName(gender, aiRole) {
  const roleLower = String(aiRole || "").toLowerCase();
  const genderLower = String(gender || "").toLowerCase();

  const isMale =
    genderLower === "male" ||
    roleLower.includes("david") ||
    roleLower.includes("mr.") ||
    roleLower.includes("man") ||
    roleLower.includes("boy");

  if (isMale) {
    // Karakter pria beraksen Australia/British/UK
    if (
      roleLower.includes("david") ||
      roleLower.includes("australia") ||
      roleLower.includes("british") ||
      roleLower.includes("uk") ||
      roleLower.includes("london")
    ) {
      return "fable"; // Suara ekspresif dengan aksen British/Australian vibe
    }
    return "onyx"; // Suara pria US yang berwibawa dan natural (default male)
  } else {
    // Karakter wanita
    if (
      roleLower.includes("british") ||
      roleLower.includes("uk") ||
      roleLower.includes("australia")
    ) {
      return "alloy"; // Suara netral yang cocok untuk aksen internasional
    }
    return "nova"; // Suara wanita US yang ramah dan hangat (default female)
  }
}

/**
 * Menghasilkan file audio MP3 dari teks menggunakan OpenAI TTS
 * @param {string} text Teks yang akan diucapkan
 * @param {string} gender Gender karakter ("male" / "female")
 * @param {string} aiRole Peran/nama karakter AI untuk penentuan aksen
 * @returns {Promise<string>} Nama file MP3 relatif (misal: "hash.mp3")
 */
async function generateTTS(text, gender, aiRole) {
  if (!text) {
    throw new Error("Text is required for TTS generation.");
  }

  const voice = getVoiceName(gender, aiRole);
  
  // Buat hash MD5 dari kombinasi suara dan teks untuk penamaan file cache yang unik
  const hash = crypto
    .createHash("md5")
    .update(`${voice}_${text.trim()}`)
    .digest("hex");
  const fileName = `${hash}.mp3`;
  const filePath = path.join(CACHE_DIR, fileName);

  // Jika file sudah ada di cache, langsung kembalikan nama filenya (Hit cache)
  if (fs.existsSync(filePath)) {
    console.log(`TTS Cache Hit for: "${text.substring(0, 20)}..."`);
    return fileName;
  }

  console.log(`Generating new TTS for: "${text.substring(0, 20)}..." using voice ${voice} (${aiRole || 'default'})`);

  // Panggil OpenAI TTS API
  const mp3 = await client.audio.speech.create({
    model: "tts-1",
    voice: voice,
    input: text,
  });

  // Konversi response stream ke Buffer dan simpan ke file lokal
  const buffer = Buffer.from(await mp3.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  return fileName;
}

module.exports = {
  generateTTS,
  CACHE_DIR,
};
