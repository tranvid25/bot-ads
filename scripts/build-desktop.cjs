const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
if (process.platform !== "win32") {
  console.error("This script builds the Windows installer. Run npm run desktop:build:mac on macOS.");
  process.exit(1);
}
// Keep local installer builds practical; Chromium binaries dominate the archive.
process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL ||= "1";
function run(script, args, env = process.env) {
  const result = spawnSync(process.execPath, [script, ...args], {
    stdio: "inherit",
    env,
    windowsHide: true,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
run(
  path.join(path.dirname(require.resolve("playwright/package.json")), "cli.js"),
  ["install", "chromium"],
  { ...process.env, PLAYWRIGHT_BROWSERS_PATH: path.resolve(".browser-dist") },
);
run("node_modules/electron-builder/cli.js", [
  "--config",
  "electron-builder.json",
  "--win",
  "--x64",
  "--publish",
  "never",
]);
const crypto = require("crypto");
run("scripts/verify-package.cjs", []);
for (const name of fs
  .readdirSync("release")
  .filter((n) => n.endsWith(".exe"))) {
  const digest = crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join("release", name)))
    .digest("hex");
  fs.writeFileSync(
    path.join("release", name + ".sha256"),
    `${digest}  ${name}\n`,
  );
}

