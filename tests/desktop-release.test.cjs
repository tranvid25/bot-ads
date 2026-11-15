const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const version = require("../package.json").version;
const source = fs.readFileSync("scripts/publish-desktop-release.cjs", "utf8");
const names = ["", "-Lite"]
  .flatMap((suffix) => {
    const name = `BotAds-Setup-${version}${suffix}.exe`;
    return [name, `${name}.sha256`, `${name}.blockmap`];
  })
  .concat(["stable-win32-x64-full.yml", "stable-win32-x64-lite.yml"]);
function runRelease(assets) {
  const calls = [];
  const sentinel = new Error("EXIT");
  try {
    vm.runInNewContext(source, {
      require: (name) => {
        if (name === "../package.json") return { version };
        if (name === "node:child_process")
          return {
            spawnSync: (command, args) => {
              calls.push(args);
              assert.equal(command, "gh");
              return {
                status: 0,
                stdout: JSON.stringify({ draft: false, assets }),
              };
            },
          };
        return require(name);
      },
      console: { log() {} },
      process: {
        env: {
          GH_REPO: "fixture/repo",
          GH_TOKEN: "fixture",
          GITHUB_SHA: "fixture",
        },
        exit: () => {
          throw sentinel;
        },
      },
    });
  } catch (error) {
    if (error !== sentinel) throw error;
  }
  return calls;
}
test("complete public release is never overwritten during subsequent web deployments", () => {
  const calls = runRelease(names.map((name) => ({ name, size: 100 })));
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "api");
});
test("incomplete public release blocks deployment instead of silently retaining a broken download", () => {
  assert.throws(() => runRelease([]), /incomplete/);
});
test("production installer URL matches source version and selects the lightweight installer", () => {
  const config = fs.readFileSync("wrangler.jsonc", "utf8");
  const urls = [...config.matchAll(/"DOWNLOAD_URL":\s*"([^"]+)"/g)];
  assert.equal(
    urls.at(-1)[1],
    `https://github.com/tranvid25/bot-ads/releases/download/v${version}/BotAds-Setup-${version}-Lite.exe`,
  );
});
test("backend deploy waits for a desktop release", () => {
  const workflow = require("js-yaml").load(
    fs.readFileSync(".github/workflows/deploy-production.yml", "utf8"),
  );
  assert.ok(workflow.jobs.deploy.needs.includes("desktop-release"));
  assert.equal(workflow.jobs["desktop-release"].with.publish, true);
  const windows = require("js-yaml").load(
    fs.readFileSync(".github/workflows/windows-desktop.yml", "utf8"),
  );
  assert.equal(windows.jobs.publish.needs, "build");
  assert.equal(windows.jobs.publish.permissions.contents, "write");
});
