const { test } = require("node:test");
const assert = require("node:assert/strict");
const pair = require("../apps/companion/runtime/pair.cjs");

test("revoked device stops its runner, shows pairing again and does not retry the rejected token", async () => {
  const original = global.fetch;
  const messages = [], logs = [];
  let requests = 0;
  const auth = { cookies: [{ name: "c_user", value: "fixture" }] };
  const ctx = {
    credentials: { connection: { server: "https://bot.salesora.space", token: "old" }, auth },
    lastSeen: Date.now(), logs, log: text => logs.push(text), notify() {},
    child: { send: value => messages.push(value) },
  };
  ctx.state = require("../apps/companion/runtime/status.cjs")(ctx).state;
  ctx.request = require("../apps/companion/runtime/http.cjs")(ctx).request;
  const { tick } = require("../apps/companion/runtime/jobs.cjs")(ctx);
  try {
    global.fetch = async () => {
      requests++;
      return Response.json({ error: "Liên kết thiết bị đã hết hiệu lực." }, { status: 401 });
    };
    await tick();
    assert.deepEqual(messages, [{ type: "stop" }]);
    assert.equal(ctx.state().linked, false);
    assert.equal(ctx.state().online, false);
    assert.match(ctx.error, /ghép lại/);
    assert.equal(ctx.credentials.auth, auth);
    await tick();
    await assert.rejects(ctx.request("/heartbeat"), /ghép lại/);
    assert.equal(requests, 1);
    assert.equal(logs.length, 1);
    ctx.credentials.connection = { server: "https://bot.salesora.space", token: "new" };
    global.fetch = async () => Response.json({ ok: true });
    await ctx.request("/heartbeat");
    assert.equal(ctx.state().linked, true);
    assert.equal(ctx.state().online, true);
  } finally { global.fetch = original; }
});

test("late unauthorized response from old pairing cannot invalidate a newly paired device", async () => {
  const original = global.fetch;
  let respond;
  const ctx = { credentials: { connection: { server: "https://bot.salesora.space", token: "old" } } };
  const { request } = require("../apps/companion/runtime/http.cjs")(ctx);
  try {
    global.fetch = () => new Promise(resolve => { respond = resolve; });
    const pending = request("/heartbeat");
    ctx.credentials.connection = { server: "https://bot.salesora.space", token: "new" };
    respond(Response.json({}, { status: 401 }));
    await assert.rejects(pending, error => error.status === 409);
    assert.equal(ctx.credentials.connection.invalid, undefined);
  } finally { global.fetch = original; }
});
test("wrong website HTTP 405 explains the BotAds address and diagnostics omit credentials", async () => {
  const original = global.fetch;
  let contents = "";
  const ctx = {
    validateServer: (value) => value,
    path: require("node:path"),
    app: { getPath: () => "test-data", getVersion: () => "test" },
    os: { hostname: () => "fixture" },
    fs: {
      mkdirSync() {},
      readFileSync: () => contents || "[]",
      writeFileSync: (_, value) => {
        contents = value;
      },
    },
  };
  try {
    global.fetch = async () => new Response("", { status: 405 });
    await assert.rejects(
      pair(ctx, {
        server: "https://xaywebsite.com",
        code: "private-pair-code",
      }),
      /https:\/\/bot.salesora.space/,
    );
    assert.equal(JSON.parse(contents).at(-1).status, 405);
    assert.ok(!contents.includes("private-pair-code"));
    global.fetch = async () => {
      throw new Error("network-private-detail");
    };
    await assert.rejects(
      pair(ctx, {
        server: "https://bot.salesora.space",
        code: "private-pair-code",
      }),
      /Không kết nối/,
    );
    assert.equal(JSON.parse(contents).at(-1).event, "pair-network-error");
    assert.ok(!contents.includes("network-private-detail"));
  } finally {
    global.fetch = original;
  }
});
