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

for (const resumeDraft of [false, true]) {
  test(`draft tag 404 supports ${resumeDraft ? "resuming" : "creating"} and verifying before publication`, () => {
    const calls = [];
    let created = resumeDraft;
    let uploaded = false;
    const draft = () => ({
      id: 42, tag_name: `v${version}`, draft: true,
      assets: uploaded ? names.map((name) => ({ name, size: 100 })) : [],
    });
    vm.runInNewContext(source, {
      require(name) {
        if (name === "../package.json") return { version };
        if (name === "node:fs") return {
          readdirSync: () => names.map((name) => ({ name, isDirectory: () => false })),
          readFileSync: () => "checksum",
          writeFileSync() {},
        };
        if (name === "node:crypto") return {
          createHash: () => ({ update() { return this; }, digest: () => "checksum" }),
        };
        if (name === "node:child_process") return {
          spawnSync(command, args) {
            assert.equal(command, "gh");
            calls.push(args);
            const ok = (value) => ({ status: 0, stdout: JSON.stringify(value) });
            if (args[0] === "api") {
              if (args[1].includes("/tags/") || args[1].endsWith("/latest"))
                return { status: 1, stderr: "gh: Not Found (HTTP 404)" };
              if (args[1].includes("?per_page=")) return ok([[], created ? [draft()] : []]);
              assert.equal(args[1], "repos/fixture/repo/releases/42");
              return ok(draft());
            }
            if (args[1] === "create") created = true;
            if (args[1] === "upload") uploaded = true;
            if (args[1] === "edit") assert.ok(uploaded);
            return ok({});
          },
        };
        return require(name);
      },
      process: { env: { GH_REPO: "fixture/repo", GH_TOKEN: "fixture", GITHUB_SHA: "fixture" } },
      console: { log() {} },
    });
    assert.equal(calls.filter((args) => args[1] === "create").length, resumeDraft ? 0 : 1);
    assert.equal(calls.at(-2)[1], "repos/fixture/repo/releases/42");
    assert.equal(calls.at(-1)[1], "edit");
  });
}
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
