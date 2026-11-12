const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { measure } = require("./desktop-size.cjs");
if (process.platform !== "win32") {
  console.error(
    "Build Windows installers on Windows; use desktop:build:mac on a Mac.",
  );
  process.exit(1);
}
const lite = process.argv.includes("--lite");
const root = process.cwd(),
  output = path.join(root, "release", ...(lite ? ["lite"] : []));
const browserRoot = path.resolve(".browser-dist");
const config = JSON.parse(fs.readFileSync("electron-builder.json", "utf8"));
require("./desktop-updates.cjs").configureUpdates(config, {
  platform: "win32",
  arch: "x64",
  lite,
});
// Build-time cost only: customers receive a smaller download.
process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL ||= "9";
config.compression = "maximum";
config.electronLanguages = ["en-US", "vi"];
config.extraMetadata.botadsBrowserMode = lite ? "system" : "bundled";
config.directories.output = output;
config.win.artifactName = lite
  ? "BotAds-Setup-${version}-Lite.${ext}"
  : "BotAds-Setup-${version}.${ext}";
function run(script, args, env = process.env) {
  const result = spawnSync(process.execPath, [script, ...args], {
    stdio: "inherit",
    env,
    windowsHide: true,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
if (lite) config.extraResources = [];
else {
  run(
    path.join(
      path.dirname(require.resolve("playwright/package.json")),
      "cli.js",
    ),
    ["install", "chromium", "--no-shell"],
    { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browserRoot },
  );
  process.env.PLAYWRIGHT_BROWSERS_PATH = browserRoot;
  const executable = require("playwright").chromium.executablePath();
  const relative = path.relative(browserRoot, executable);
  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    !fs.existsSync(executable)
  )
    throw new Error(
      "Expected Playwright Chromium binary inside .browser-dist.",
    );
  const directory = relative.split(path.sep)[0];
  // Copy only this Playwright revision, never old cached browsers or the shell.
  config.extraResources = [
    {
      from: path.join(browserRoot, directory),
      to: `browsers/${directory}`,
      filter: ["**/*"],
    },
  ];
}
fs.mkdirSync(".worker-build", { recursive: true });
const generated = path.resolve(
  `.worker-build/desktop-${lite ? "lite" : "full"}.json`,
);
fs.writeFileSync(generated, JSON.stringify(config, null, 2));
run("node_modules/electron-builder/cli.js", [
  "--config",
  generated,
  "--win",
  "--x64",
  "--publish",
  "never",
]);
run("scripts/verify-package.cjs", [], {
  ...process.env,
  BOTADS_APP_ASAR: path.join(output, "win-unpacked/resources/app.asar"),
  BOTADS_PACKAGE_VARIANT: lite ? "lite" : "full",
});
const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const artifact = `BotAds-Setup-${version}${lite ? "-Lite" : ""}.exe`;
const digest = crypto
  .createHash("sha256")
  .update(fs.readFileSync(path.join(output, artifact)))
  .digest("hex");
fs.writeFileSync(
  path.join(output, artifact + ".sha256"),
  `${digest}  ${artifact}\n`,
);
const size = measure(output, artifact, lite ? "lite" : "full");
require("./verify-update-feed.cjs").verifyFeed(output, "win32", "x64", lite);
fs.writeFileSync(
  path.join(output, "package-size.json"),
  JSON.stringify(size, null, 2) + "\n",
);
console.log(JSON.stringify(size));
