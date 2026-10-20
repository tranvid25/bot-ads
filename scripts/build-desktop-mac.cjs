const { spawnSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

if (process.platform !== "darwin") {
  console.error("Build the macOS app on a Mac. This script cannot create a valid .dmg on Windows.");
  process.exit(1);
}

const arch = process.arch;
if (!new Set(["arm64", "x64"]).has(arch)) {
  console.error(`Unsupported Mac architecture: ${arch}`);
  process.exit(1);
}

process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL ||= "1";
process.env.CSC_IDENTITY_AUTO_DISCOVERY = "false";
const browserPath = path.resolve(".browser-dist");

function run(script, args, env = process.env) {
  const result = spawnSync(process.execPath, [script, ...args], {
    stdio: "inherit",
    env,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

run(
  path.join(path.dirname(require.resolve("playwright/package.json")), "cli.js"),
  ["install", "chromium"],
  { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browserPath },
);
run("node_modules/electron-builder/cli.js", [
  "--config",
  "electron-builder.json",
  "--mac",
  `--${arch}`,
  "--publish",
  "never",
]);

const appAsar = path.join(
  "release",
  `mac-${arch}`,
  "BotAds.app",
  "Contents",
  "Resources",
  "app.asar",
);
run("scripts/verify-package.cjs", [], {
  ...process.env,
  BOTADS_APP_ASAR: path.resolve(appAsar),
});

for (const name of fs
  .readdirSync("release")
  .filter((file) => file.endsWith(`-${arch}.dmg`))) {
  const digest = crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join("release", name)))
    .digest("hex");
  fs.writeFileSync(
    path.join("release", `${name}.sha256`),
    `${digest}  ${name}\n`,
  );
}
