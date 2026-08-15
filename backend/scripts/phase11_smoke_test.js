const assert = require("node:assert/strict");

const baseUrl = String(
  process.env.PHASE11_BASE_URL ||
    "https://interculturalarandai-production.up.railway.app"
).replace(/\/$/, "");

async function request(path, options = {}) {
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  let body = null;
  try {
    body = await response.json();
  } catch (_) {}
  return {
    path,
    status: response.status,
    duration_ms: Date.now() - startedAt,
    body,
  };
}

async function main() {
  const report = {
    phase: 11,
    target: baseUrl,
    executed_at: new Date().toISOString(),
    checks: [],
  };

  const topics = await request("/api/topics");
  report.checks.push({ name: "three guided topics", ...topics, body: undefined });
  assert.equal(topics.status, 200);
  assert.equal(topics.body.length, 3);

  let settingCount = 0;
  for (const topic of topics.body) {
    const topicId = topic.topic_id || topic.topicId;
    const settings = await request(`/api/topics/${encodeURIComponent(topicId)}/settings`);
    report.checks.push({
      name: `settings for ${topicId}`,
      path: settings.path,
      status: settings.status,
      duration_ms: settings.duration_ms,
      count: Array.isArray(settings.body) ? settings.body.length : 0,
    });
    assert.equal(settings.status, 200);
    settingCount += settings.body.length;
  }
  assert.equal(settingCount, 6);

  const scenarios = await request("/api/scenarios");
  report.checks.push({
    name: "legacy scenarios remain available",
    path: scenarios.path,
    status: scenarios.status,
    duration_ms: scenarios.duration_ms,
    count: Array.isArray(scenarios.body) ? scenarios.body.length : 0,
  });
  assert.equal(scenarios.status, 200);
  assert.ok(scenarios.body.length >= 10);

  const invalidQr = await request("/api/launch/resolve", {
    method: "POST",
    body: { token: "definitely-invalid-phase11-token" },
  });
  report.checks.push({ name: "invalid QR rejected safely", ...invalidQr, body: undefined });
  assert.ok([400, 404, 410].includes(invalidQr.status));

  report.result = "pass";
  report.guided_topic_count = topics.body.length;
  report.guided_setting_count = settingCount;
  report.legacy_scenario_count = scenarios.body.length;
  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(JSON.stringify({
      phase: 11,
      target: baseUrl,
      executed_at: new Date().toISOString(),
      result: "fail",
      error: error.message,
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = { main };
