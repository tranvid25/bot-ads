const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const asar = require("@electron/asar");
const archive =
  process.env.BOTADS_APP_ASAR || "release/win-unpacked/resources/app.asar";
assert.ok(fs.existsSync(archive), `Packaged app archive not found: ${archive}`);
const files = asar
  .listPackage(archive)
  .map((name) => name.replaceAll("\\", "/"));
for (const required of [
  "/apps/companion/main.cjs",
  "/apps/companion/runner.cjs",
  "/apps/companion/discovery-client.cjs",
  "/apps/companion/runtime/jobs.cjs",
  "/packages/automation/discover_only.cjs",
  "/packages/automation/automation.js",
  "/packages/automation/storage.js",
  "/packages/desktop-state.cjs",
  "/packages/social-contract.cjs",
  "/packages/browser-launcher.cjs",
  "/packages/desktop-update.cjs",
  "/node_modules/electron-updater/package.json",
  "/apps/companion/runtime/updater.cjs",
  "/apps/companion/social-runner.cjs",
  "/apps/companion/social-client.cjs",
  "/apps/companion/social/threads.cjs",
  "/apps/companion/social/instagram.cjs",
]) {
  assert.ok(files.includes(required), `Missing runtime file: ${required}`);
}
const forbidden = files.filter(
  (name) =>
    !name.startsWith("/node_modules/") &&
    /(?:^|\/)(?:auth\.json|config\.json|\.dev\.vars|credentials\.bin|history\.json|automation_state\.json|ai_posts_pool\.json|social-report\.json|discovery-report\.json|reservations\.json|active-job\.json|user_data)(?:\/|$)/.test(
      name,
    ),
);
assert.deepEqual(
  forbidden,
  [],
  "Private data must never be shipped with the app.",
);
for (const name of files.filter(
  (name) =>
    /^\/apps\/companion\/.+\.(cjs|js|css|html)$/.test(name) ||
    /^\/packages\/((desktop-state|social-contract|browser-launcher|desktop-update)\.cjs|automation\/[^/]+\.(js|cjs))$/.test(
      name,
    ),
)) {
  const source = name.slice(1);
  assert.deepEqual(
    asar.extractFile(archive, path.normalize(source)),
    fs.readFileSync(source),
    `Packaged source is stale: ${source}`,
  );
}
const variant = process.env.BOTADS_PACKAGE_VARIANT;
if (variant) {
  const metadata = JSON.parse(
    asar.extractFile(archive, "package.json").toString(),
  );
  assert.equal(
    metadata.botadsBrowserMode,
    variant === "lite" ? "system" : "bundled",
    "Distribution metadata must select the right browser even after an upgrade.",
  );
}
const browsers = path.join(path.dirname(archive), "browsers");
if (variant === "lite")
  assert.equal(
    fs.existsSync(browsers),
    false,
    "Lite must not ship any browser binaries.",
  );
if (variant === "full") {
  const browserNames = fs.readdirSync(browsers);
  assert.equal(
    browserNames.length,
    1,
    "Full ships only the current Chromium revision.",
  );
  assert.match(browserNames[0], /^chromium-\d+$/);
  assert.equal(
    browserNames.some((name) => name.includes("headless")),
    false,
  );
}
console.log(
  "PASS: packaged runtime present; no private configuration, sessions or history.",
);
