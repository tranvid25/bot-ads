const fs = require("fs");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
if (!fs.existsSync(".dev.vars"))
  fs.writeFileSync(
    ".dev.vars",
    `AUTH_SECRET=${crypto.randomBytes(32).toString("hex")}\n# GEMINI_API_KEY=\n# GEMINI_MODEL=\n`,
  );
const localVars = fs.readFileSync(".dev.vars", "utf8");
if (!/^TOKEN_ENCRYPTION_KEY=/m.test(localVars)) {
  fs.appendFileSync(".dev.vars", `\nTOKEN_ENCRYPTION_KEY=${crypto.randomBytes(32).toString("base64")}\n`);
  console.log("Đã khởi tạo khóa bảo vệ kết nối marketing local (không hiển thị khóa).");
}
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
