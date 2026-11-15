const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const version = require("../package.json").version;
if (!/^\d+\.\d+\.\d+$/.test(version))
  throw new Error("Stable releases require a stable version.");
const tag = `v${version}`;
const repo = process.env.GH_REPO;
if (!repo || !process.env.GH_TOKEN || !process.env.GITHUB_SHA)
  throw new Error("Run inside the authenticated GitHub release workflow.");
function gh(args, allowFailure = false) {
  const result = spawnSync("gh", args, { encoding: "utf8" });
  if (result.status !== 0 && !allowFailure)
    throw new Error(`GitHub release command failed: ${result.stderr}`);
  return result;
}
const required = ["", "-Lite"]
  .flatMap((suffix) => {
    const name = `BotAds-Setup-${version}${suffix}.exe`;
    return [name, `${name}.sha256`, `${name}.blockmap`];
  })
  .concat(["stable-win32-x64-full.yml", "stable-win32-x64-lite.yml"]);
const existing = gh(["api", `repos/${repo}/releases/tags/${tag}`], true);
let release = existing.status === 0 ? JSON.parse(existing.stdout) : null;
function assertAssets(value) {
  for (const name of required)
    if (!value.assets.some((asset) => asset.name === name && asset.size > 0))
      throw new Error(`Release is incomplete: missing ${name}`);
}
if (release && !release.draft) {
  assertAssets(release);
  console.log(
    `Existing complete release ${tag} retained; published binaries are immutable.`,
  );
  process.exit(0);
}
const files = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) walk(file);
    else if (/\.(exe|sha256|blockmap|yml)$/.test(item.name)) files.push(file);
  }
}
walk("release-artifacts");
for (const name of required) {
  if (files.filter((file) => path.basename(file) === name).length !== 1)
    throw new Error(`Missing or duplicate verified artifact: ${name}`);
}
for (const file of files.filter((file) => file.endsWith(".exe"))) {
  const expected = fs.readFileSync(`${file}.sha256`, "utf8").split(/\s+/)[0];
  const digest = crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
  if (digest !== expected) throw new Error("Installer checksum mismatch.");
}
// Preserve previously supported Mac feeds when latest moves to a Windows release.
const latestResult = gh(["api", `repos/${repo}/releases/latest`], true);
if (latestResult.status === 0) {
  const latest = JSON.parse(latestResult.stdout);
  const macAssets = latest.assets.filter(
    (asset) =>
      /-mac\.yml$/.test(asset.name) ||
      /^BotAds-.*-(arm64|x64)-(Lite|Full)\.(zip|dmg)(\.blockmap|\.sha256)?$/.test(
        asset.name,
      ),
  );
  if (macAssets.length) {
    fs.mkdirSync("release-artifacts/mac", { recursive: true });
    for (const asset of macAssets) {
      gh([
        "release",
        "download",
        latest.tag_name,
        "--pattern",
        asset.name,
        "--dir",
        "release-artifacts/mac",
        "--clobber",
      ]);
      files.push(path.join("release-artifacts/mac", asset.name));
    }
  }
}
if (!release) {
  fs.writeFileSync(
    "release-artifacts/notes.md",
    `BotAds ${version}\n\nWindows Lite/Full with automatic update support. Includes Facebook login window and connection diagnostics fixes.\n`,
  );
  gh([
    "release",
    "create",
    tag,
    "--draft",
    "--target",
    process.env.GITHUB_SHA,
    "--title",
    `BotAds ${version}`,
    "--notes-file",
    "release-artifacts/notes.md",
  ]);
}
gh(["release", "upload", tag, ...files, "--clobber"]);
release = JSON.parse(gh(["api", `repos/${repo}/releases/tags/${tag}`]).stdout);
assertAssets(release);
gh(["release", "edit", tag, "--draft=false", "--latest"]);
console.log(
  `Published complete release ${tag}; deployment may now use its download URL.`,
);
