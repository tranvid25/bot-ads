const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const yaml = require("js-yaml");
const { updateFeed } = require("../packages/desktop-update.cjs");
function verifyFeed(output, platform, arch, lite) {
  const feed = updateFeed(platform, arch, lite);
  const filename =
    feed.channel + (platform === "darwin" ? "-mac" : "") + ".yml";
  const info = yaml.load(fs.readFileSync(path.join(output, filename), "utf8"));
  assert.equal(info.version, require("../package.json").version);
  assert.ok(info.files?.length, "Update metadata must contain artifacts");
  for (const file of info.files) {
    assert.equal(
      path.basename(file.url),
      file.url,
      "Artifact must be a relative filename",
    );
    const expected =
      platform === "win32"
        ? `BotAds-Setup-${info.version}${lite ? "-Lite" : ""}.exe`
        : `BotAds-${info.version}-${arch}-${lite ? "Lite" : "Full"}.`;
    assert.ok(
      platform === "win32"
        ? file.url === expected
        : file.url.startsWith(expected),
    );
    const bytes = fs.readFileSync(path.join(output, file.url));
    assert.equal(
      crypto.createHash("sha512").update(bytes).digest("base64"),
      file.sha512,
    );
    assert.equal(bytes.length, file.size);
  }
  const config = yaml.load(
    fs.readFileSync(
      path.join(
        output,
        platform === "win32"
          ? "win-unpacked/resources/app-update.yml"
          : `${arch === "arm64" ? "mac-arm64" : "mac"}/BotAds.app/Contents/Resources/app-update.yml`,
      ),
      "utf8",
    ),
  );
  assert.equal(config.channel, feed.channel);
  assert.equal(config.url, feed.url);
  console.log(
    `PASS: ${filename} matches package channel, artifacts and SHA-512 checksums.`,
  );
}
if (require.main === module)
  verifyFeed(
    process.argv[2],
    process.argv[3],
    process.argv[4],
    process.argv[5] === "lite",
  );
module.exports = { verifyFeed };
