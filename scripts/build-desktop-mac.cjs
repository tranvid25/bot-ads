const { spawnSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { macConfig } = require("./mac-build-config.cjs");
const { directoryBytes } = require("./desktop-size.cjs");

if (process.platform !== "darwin") {
  console.error(
    "Build macOS installers on a native Mac or the macos-desktop GitHub workflow.",
  );
  process.exit(1);
}
const arch = process.arch;
const lite = process.argv.includes("--lite");
const signed = process.argv.includes("--signed");
const variant = lite ? "lite" : "full";
const config = macConfig({ arch, lite, signed, env: process.env });
const output = path.resolve(config.directories.output);
process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL ||= "9";
if (!signed) process.env.CSC_IDENTITY_AUTO_DISCOVERY = "false";
function run(binary, args, env = process.env) {
  const result = spawnSync(binary, args, { stdio: "inherit", env });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${path.basename(binary)} failed (${result.status})`);
}
function node(script, args = [], env = process.env) {
  run(process.execPath, [script, ...args], env);
}
if (!lite) {
  const browserRoot = path.resolve(`.browser-dist/mac-${arch}`);
  process.env.PLAYWRIGHT_BROWSERS_PATH = browserRoot;
  node(
    path.join(
      path.dirname(require.resolve("playwright/package.json")),
      "cli.js",
    ),
    ["install", "chromium", "--no-shell"],
  );
  const executable = require("playwright").chromium.executablePath();
  const relative = path.relative(browserRoot, executable);
  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    !fs.existsSync(executable)
  )
    throw new Error(
      "Expected native Playwright Chromium inside the build browser directory.",
    );
  const directory = relative.split(path.sep)[0];
  config.extraResources = [
    {
      from: path.join(browserRoot, directory),
      to: `browsers/${directory}`,
      filter: ["**/*"],
    },
  ];
}
fs.mkdirSync(".worker-build", { recursive: true });
const generated = path.resolve(`.worker-build/mac-${arch}-${variant}.json`);
fs.writeFileSync(generated, JSON.stringify(config, null, 2));
node("node_modules/electron-builder/cli.js", [
  "--config",
  generated,
  "--mac",
  `--${arch}`,
  "--publish",
  "never",
]);
const app = path.join(
  output,
  arch === "arm64" ? "mac-arm64" : "mac",
  "BotAds.app",
);
const resources = path.join(app, "Contents/Resources");
const binary = path.join(app, "Contents/MacOS/BotAds");
run("lipo", ["-verify_arch", arch === "x64" ? "x86_64" : "arm64", binary]);
run("codesign", ["--verify", "--deep", "--strict", "--verbose=2", app]);
node("scripts/verify-package.cjs", [], {
  ...process.env,
  BOTADS_APP_ASAR: path.join(resources, "app.asar"),
  BOTADS_PACKAGE_VARIANT: variant,
});
if (signed) {
  run("xcrun", ["stapler", "validate", app]);
  run("spctl", ["--assess", "--type", "execute", "--verbose=2", app]);
  require("./verify-update-feed.cjs").verifyFeed(output, "darwin", arch, lite);
}
const version = require("../package.json").version;
const artifacts = ["dmg", "zip"].map(
  (ext) => `BotAds-${version}-${arch}-${lite ? "Lite" : "Full"}.${ext}`,
);
for (const name of artifacts) {
  const file = path.join(output, name);
  const digest = crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
  fs.writeFileSync(`${file}.sha256`, `${digest}  ${name}\n`);
}
const size = {
  platform: "darwin",
  arch,
  variant,
  signed,
  installedBytes: directoryBytes(app),
  browserBytes: directoryBytes(path.join(resources, "browsers")),
  artifacts: artifacts.map((name) => ({
    name,
    bytes: fs.statSync(path.join(output, name)).size,
  })),
};
fs.writeFileSync(
  path.join(output, "package-size.json"),
  JSON.stringify(size, null, 2) + "\n",
);
console.log(JSON.stringify(size));
