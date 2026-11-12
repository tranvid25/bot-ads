const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const discoveryClient = require("../apps/companion/discovery-client.cjs");
const { campaignConfig } = require("../packages/desktop-state.cjs");

test("reviewed campaign cannot reintroduce unselected groups through sync or discovery cache", () => {
  const chosen = "https://www.facebook.com/groups/chosen";
  const config = campaignConfig(
    {
      workflowVersion: 2,
      groupUrls: [chosen],
      mode: "manual",
      posts: [],
      keywords: ["website"],
      dailyLimit: 3,
      autoDiscover: true,
      autoJoin: true,
    },
    { daily_limit: 30, timezone: "Asia/Ho_Chi_Minh" },
    { id: "job", campaignId: "campaign" },
    {},
    {},
    {
      cloudCampaignId: "campaign",
      discoveredGroups: ["https://www.facebook.com/groups/unselected"],
    },
  );
  assert.deepEqual(config.groups, [chosen]);
  assert.deepEqual(config.discoveredGroups, []);
  assert.deepEqual(config.automation, {
    search: false,
    sync: false,
    join: false,
    generateAI: false,
  });
});

test("discovery uses only sync/search/inspect, merges joined groups and honors stop guards", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "botads-discovery-"));
  const old = process.env.BOTADS_DATA_DIR;
  process.env.BOTADS_DATA_DIR = dir;
  try {
    const { main } = require("../packages/automation/discover_only.cjs");
    const runtime = require("../packages/automation/runtime");
    const calls = [];
    const joined = "https://www.facebook.com/groups/joined";
    const found = "https://www.facebook.com/groups/found";
    const task = {
      config: { keywords: ["website"], excludedKeywords: [], limit: 10 },
    };
    const dependencies = {
      sync: async () => {
        calls.push("sync");
        return [joined];
      },
      search: async () => {
        calls.push("search");
        return [found, joined];
      },
      inspect: async ({ config }) => {
        calls.push("inspect");
        assert.deepEqual(config.discoveredGroups, [found, joined]);
      },
    };
    const groups = await main(task, dependencies);
    assert.deepEqual(calls, ["sync", "search", "inspect"]);
    assert.equal(groups.length, 2);
    assert.equal(groups[1].source, "joined");
    assert.equal(
      Object.keys(require.cache).some((key) => /post_runner\.js$/.test(key)),
      false,
    );
    runtime.setExecutionGuard(() => {
      throw new runtime.HaltError("stop");
    });
    await assert.rejects(main(task, dependencies), /stop/);
    runtime.setExecutionGuard(null);
    assert.deepEqual(
      await main(task, {
        sync: async () => [],
        search: async () => [],
        inspect: async () => {},
      }),
      [],
    );
  } finally {
    if (old === undefined) delete process.env.BOTADS_DATA_DIR;
    else process.env.BOTADS_DATA_DIR = old;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("desktop retries persisted reports without rerunning discovery and hashes account scope", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "botads-report-"));
  const requests = [],
    childMessages = [];
  let finish,
    fail = true;
  const client = discoveryClient({
    dataDir: () => dir,
    stopped: () => false,
    log: () => {},
    getAuth: () => ({ cookies: [{ name: "c_user", value: "private-id" }] }),
    getChild: () => ({ send: (value) => childMessages.push(value) }),
    spawnRunner: async (message) => {
      assert.equal(message.action, "discover");
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
    request: async (url, method, body) => {
      requests.push({ url, body });
      if (url.endsWith("/claim")) return { task: { id: "task", config: {} } };
      if (url.endsWith("/heartbeat")) return { stop: true };
      if (fail) throw new Error("offline");
      return { ok: true };
    },
  });
  try {
    await client.tick();
    assert.equal(
      requests[0].body.accountKey,
      crypto.createHash("sha256").update("facebook:private-id").digest("hex"),
    );
    assert.equal(JSON.stringify(requests).includes("private-id"), false);
    await client.tick();
    assert.deepEqual(childMessages, [{ type: "stop" }]);
    finish({ groups: [], error: "" });
    await new Promise((resolve) => setImmediate(resolve));
    await assert.rejects(client.tick(), /offline/);
    assert.equal(client.busy(), true);
    fail = false;
    await client.tick();
    assert.equal(client.busy(), false);
    assert.equal(requests.filter((r) => r.url.endsWith("/claim")).length, 1);
    fs.writeFileSync(
      path.join(dir, "discovery-report.json"),
      JSON.stringify({
        taskId: "old",
        groups: [],
        sequence: 1,
        finished: false,
      }),
    );
    const recovered = discoveryClient({
      dataDir: () => dir,
      stopped: () => false,
      log: () => {},
      getAuth: () => null,
      getChild: () => null,
      spawnRunner: () => {
        throw new Error("must not rerun");
      },
      request: async (url, method, body) => {
        assert.equal(body.finished, true);
        assert.match(body.error, /khởi động lại/);
        return { ok: true };
      },
    });
    await recovered.tick();
    assert.equal(recovered.busy(), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
