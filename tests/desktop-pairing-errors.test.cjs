const { test } = require("node:test");
const assert = require("node:assert/strict");
const pair = require("../apps/companion/runtime/pair.cjs");
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
