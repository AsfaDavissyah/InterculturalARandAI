const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");

const AudioCache = require("../models/AudioCache");
const { app } = require("../backend_core");
const vercelHandler = require("../api");
const { generateTTSBuffer } = require("../services/tts_service");

test("Vercel configuration routes requests through one serverless function", () => {
  const config = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "vercel.json"), "utf8")
  );

  assert.equal(config.rewrites[0].source, "/(.*)");
  assert.equal(config.rewrites[0].destination, "/api");
  assert.equal(config.functions["api/index.js"].maxDuration, 60);
  assert.equal(typeof vercelHandler, "function");
  const exportedApp = require("../server");
  assert.equal(typeof exportedApp, "function");
  assert.equal(typeof exportedApp.use, "function");
});

test("audio cache records expire automatically", () => {
  const expiresAt = AudioCache.schema.path("expiresAt");
  assert.equal(expiresAt.options.required, true);
  assert.equal(expiresAt.options.expires, 0);
  assert.equal(typeof generateTTSBuffer, "function");
});

test("audio cache endpoint rejects invalid keys before querying MongoDB", async (t) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/tts/audio/not-an-audio-key`
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.message, "Invalid audio cache key.");
});
