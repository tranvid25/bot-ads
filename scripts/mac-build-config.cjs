const fs = require("node:fs");
const path = require("node:path");

function macConfig({ arch, lite = false, signed = false, env = process.env }) {
  if (!["arm64", "x64"].includes(arch))
    throw new Error("Unsupported native Mac architecture.");
  if (signed) {
    const required = [
      "CSC_LINK",
      "CSC_KEY_PASSWORD",
      "APPLE_ID",
      "APPLE_APP_SPECIFIC_PASSWORD",
      "APPLE_TEAM_ID",
    ];
    const missing = required.filter((name) => !env[name]);
    if (missing.length)
      throw new Error(`Signed release requires: ${missing.join(", ")}`);
  }
  const config = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../electron-builder.json"), "utf8"),
  );
  config.compression = "maximum";
  config.electronLanguages = ["en-US", "vi"];
  config.extraMetadata.botadsBrowserMode = lite ? "system" : "bundled";
  config.directories.output = `release/macos/${arch}/${lite ? "lite" : "full"}`;
  config.extraResources = [];
  config.forceCodeSigning = signed;
  config.mac = {
    ...config.mac,
    target: [
      { target: "dmg", arch: [arch] },
      { target: "zip", arch: [arch] },
    ],
    artifactName: `BotAds-\${version}-\${arch}-${lite ? "Lite" : "Full"}.\${ext}`,
    hardenedRuntime: signed,
    notarize: signed,
  };
  if (signed) delete config.mac.identity;
  else config.mac.identity = "-";
  return require("./desktop-updates.cjs").configureUpdates(config, {
    platform: "darwin",
    arch,
    lite,
    enabled: signed,
  });
}
module.exports = { macConfig };
