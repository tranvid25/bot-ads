import { test } from "node:test";
import assert from "node:assert/strict";
import { devIdentity } from "../apps/api/services/marketing-providers/dev.mjs";
import { devHeaders } from "../apps/api/services/marketing-providers/oauth.mjs";

test("DEV authentication and publication headers identify BotAds", async () => {
  assert.match(devHeaders("fixture")["User-Agent"], /BotAds/);
  const env = {
    PROVIDER_HTTP: {
      fetch: async (url, options) => {
        assert.equal(url, "https://dev.to/api/users/me");
        assert.match(options.headers["User-Agent"], /BotAds/);
        assert.equal(options.headers["api-key"], "fixture");
        assert.equal(options.redirect, "manual");
        return Response.json({ id: 123, username: "fixture" });
      },
    },
  };
  assert.equal((await devIdentity(env, "fixture")).actorId, "123");
});
test("DEV failures distinguish invalid key, forbidden access, rate limit and outage", async () => {
  for (const [status, expected] of [
    [401, 400],
    [403, 502],
    [429, 429],
    [500, 502],
    [302, 502],
  ]) {
    const env = {
      PROVIDER_HTTP: {
        fetch: async () => new Response("upstream-private-value", { status }),
      },
    };
    await assert.rejects(
      devIdentity(env, "fixture"),
      (err) =>
        err.status === expected &&
        !err.message.includes("upstream-private-value"),
    );
  }
});
test("DEV malformed JSON and empty account data produce a controlled gateway error", async () => {
  for (const data of ["", "<html>blocked</html>", "null", "{}"])
    await assert.rejects(
      devIdentity(
        { PROVIDER_HTTP: { fetch: async () => new Response(data) } },
        "fixture",
      ),
      (err) => err.status === 502,
    );
});
