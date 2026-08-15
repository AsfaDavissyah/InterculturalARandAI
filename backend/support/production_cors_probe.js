const assert = require("node:assert/strict");
const http = require("http");
const { app } = require("../server");

function request(port, origin) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/topics",
        method: "GET",
        headers: origin ? { Origin: origin } : {},
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

const server = http.createServer(app);
server.listen(0, "127.0.0.1", async () => {
  try {
    const port = server.address().port;
    const approved = await request(port, "https://intercultural-ar-and-ai.vercel.app");
    assert.equal(approved.status, 200);
    assert.equal(
      approved.headers["access-control-allow-origin"],
      "https://intercultural-ar-and-ai.vercel.app"
    );

    const blocked = await request(port, "https://malicious-site.com");
    assert.equal(blocked.status, 403);
    assert.match(blocked.body, /CORS origin is not allowed/);

    const mobile = await request(port);
    assert.equal(mobile.status, 200);
    process.stdout.write("PRODUCTION_CORS_PROBE_OK\n");
  } catch (error) {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
