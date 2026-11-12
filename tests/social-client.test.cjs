const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const createClient = require("../apps/companion/social-client.cjs");
test("desktop social persists final reports, retries delivery and never reruns after crash", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "botads-social-report-"));
  let finish,
    offline = true,
    spawned = 0;
  const sent = [],
    messages = [];
  const ctx = {
    fs,
    path,
    credentials: { social: {} },
    child: null,
    current: null,
    stoppedByUser: false,
    dataDir: () => dir,
    log: () => {},
    atom: (file, value) => fs.writeFileSync(file, JSON.stringify(value)),
    read: (file, fallback) =>
      fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : fallback,
    request: async (route, method, body) => {
      sent.push({ route, body });
      if (route === "/social/claim")
        return {
          task: {
            id: "task",
            claimToken: "claim",
            provider: "threads",
            kind: "publish",
            config: { variant: {} },
          },
        };
      if (route === "/social/heartbeat") return { stop: true };
      if (offline) throw new Error("offline");
      return { ok: true };
    },
    spawnRunner: async () => {
      spawned++;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  };
  try {
    const client = createClient(ctx);
    await client.tick();
    assert.equal(client.busy(), true);
    assert.equal(client.info().provider, "threads");
    ctx.child = { send: (message) => messages.push(message) };
    await client.tick();
    assert.deepEqual(messages, [{ type: "stop" }]);
    finish({ status: "unknown", error: "No link" });
    await new Promise((resolve) => setImmediate(resolve));
    await assert.rejects(client.tick(), /offline/);
    assert.equal(client.busy(), true);
    offline = false;
    await client.tick();
    assert.equal(client.busy(), false);
    assert.equal(spawned, 1);
    fs.writeFileSync(
      path.join(dir, "social-report.json"),
      JSON.stringify({
        taskId: "interrupted",
        claimToken: "old",
        finished: false,
      }),
    );
    const recovered = createClient(ctx);
    await recovered.tick();
    assert.equal(sent.at(-1).body.status, "unknown");
    assert.equal(spawned, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("auth IPC accepts only the requested provider and refuses silent account switching", async () => {
  const replies = [];
  const ctx = {
    credentials: {
      social: { threads: { identity: { actorId: "original" }, auth: {} } },
    },
    saveCredentials: () => {},
    log: () => {},
  };
  const handle = require("../apps/companion/runtime/social-events.cjs")(ctx);
  const child = { connected: true, send: (value) => replies.push(value) };
  const task = { task: { provider: "threads", kind: "connect" } };
  await handle(
    {
      type: "social-auth",
      provider: "instagram",
      identity: { actorId: "other" },
    },
    child,
    task,
  );
  assert.match(replies.at(-1).error, /khớp/);
  await handle(
    {
      type: "social-auth",
      provider: "threads",
      identity: { actorId: "other" },
    },
    child,
    task,
  );
  assert.match(replies.at(-1).error, /tài khoản khác/);
  assert.equal(ctx.credentials.social.threads.identity.actorId, "original");
});
