const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const findings = [];

function add(severity, check, message) {
  findings.push({ severity, check, message });
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const trackedFiles = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { cwd: root, encoding: "utf8" },
)
  .split(/\r?\n/)
  .filter(Boolean);

for (const file of trackedFiles) {
  if (/(^|\/)\.env($|\.)/.test(file) && !file.endsWith(".env.example")) {
    add("critical", "tracked-secret-file", `${file} must not be tracked.`);
  }
  if (/\.(jks|keystore|p12|p8|mobileprovision|pem|key)$/i.test(file)) {
    add("critical", "tracked-private-key", `${file} looks like signing or private-key material.`);
  }
  if (!/\.(js|cjs|mjs|json|dart|yaml|yml|md|html|kt|kts|plist|xml|txt)$/i.test(file)) continue;
  const content = read(file);
  const candidates = content.match(/sk-[A-Za-z0-9_-]{20,}/g) || [];
  for (const candidate of candidates) {
    if (/your-openai|must-not-leak|example|placeholder/i.test(candidate)) continue;
    add("critical", "embedded-openai-key", `${file} contains a possible OpenAI API key.`);
  }
}

const manifest = read("mobile_beta/android/app/src/main/AndroidManifest.xml");
if (!manifest.includes('android:usesCleartextTraffic="false"')) {
  add("critical", "android-cleartext", "Android production traffic is not restricted to HTTPS.");
}

const gradle = read("mobile_beta/android/app/build.gradle.kts");
if (gradle.includes('signingConfigs.getByName("debug")')) {
  add("warning", "android-signing", "Release currently falls back to debug signing until the client keystore exists.");
}
if (gradle.includes("com.asfadavissyah.engora")) {
  add("warning", "android-identity", "Android application ID still belongs to the developer namespace.");
}

const xcodeProject = read("mobile_beta/ios/Runner.xcodeproj/project.pbxproj");
if (xcodeProject.includes("com.example.mobile")) {
  add("warning", "ios-identity", "iOS bundle ID is still the Flutter placeholder.");
}
if (!fs.existsSync(path.join(root, "mobile_beta", "ios", "Podfile"))) {
  add("warning", "ios-dependencies", "iOS Podfile has not been generated or verified on macOS.");
}

const envExample = read("backend/.env.example");
for (const required of ["MONGODB_URI", "JWT_SECRET", "OPENAI_API_KEY", "CORS_ORIGIN"]) {
  if (!new RegExp(`^${required}=`, "m").test(envExample)) {
    add("critical", "environment-contract", `${required} is missing from backend/.env.example.`);
  }
}

const order = { critical: 0, warning: 1 };
findings.sort((left, right) => order[left.severity] - order[right.severity]);
if (findings.length === 0) {
  console.log("Release security audit: PASS (no findings)");
} else {
  console.log("Release security audit findings:");
  for (const finding of findings) {
    console.log(`- ${finding.severity.toUpperCase()} [${finding.check}] ${finding.message}`);
  }
}

const criticalCount = findings.filter((finding) => finding.severity === "critical").length;
const warningCount = findings.filter((finding) => finding.severity === "warning").length;
console.log(`Summary: ${criticalCount} critical, ${warningCount} warning(s)`);
process.exitCode = criticalCount > 0 ? 1 : 0;
