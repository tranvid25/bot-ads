const fs = require("fs");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
if (!fs.existsSync(".dev.vars"))
  fs.writeFileSync(
    ".dev.vars",
    `AUTH_SECRET=${crypto.randomBytes(32).toString("hex")}\n# GEMINI_API_KEY=\n# GEMINI_MODEL=\n`,
  );
const result = spawnSync(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "d1",
    "migrations",
    "apply",
    "botads",
    "--local",
  ],
  { stdio: "inherit", windowsHide: true },
);
process.exitCode = result.status ?? 1;
