import { test } from "node:test";
import assert from "node:assert/strict";
import { Miniflare, Response } from "miniflare";

test("LinkedIn and DEV use native Workers fetch without a provider service binding", async () => {
  const requests = [];
  const mf = new Miniflare({
    modules: true,
    scriptPath: "tests/fixtures/provider-runtime.worker.mjs",
    modulesRules: [{ type: "ESModule", include: ["**/*.mjs"] }],
    compatibilityDate: "2025-09-01",
    bindings: {
      LINKEDIN_CLIENT_ID: "fixture-client",
      LINKEDIN_CLIENT_SECRET: "fixture-secret",
    },
    // Intercept HTTP after native fetch validates its receiver. No external calls.
    outboundService: async (request) => {
      const url = new URL(request.url);
      requests.push(url.origin + url.pathname);
      if (url.pathname === "/oauth/v2/accessToken") {
        assert.equal(request.method, "POST");
        const body = new URLSearchParams(await request.text());
        assert.equal(body.get("client_id"), "fixture-client");
        assert.equal(body.get("client_secret"), "fixture-secret");
        assert.equal(
          body.get("redirect_uri"),
          "https://bot.salesora.space/api/marketing/linkedin/callback",
        );
        return Response.json({
          access_token: "fixture-token",
          expires_in: 3600,
          scope: "openid profile w_member_social",
        });
      }
      if (url.pathname === "/v2/userinfo") {
        assert.equal(
          request.headers.get("Authorization"),
          "Bearer fixture-token",
        );
        return Response.json({ sub: "fixture-member", name: "Runtime Test" });
      }
      if (url.pathname === "/api/users/me") {
        assert.equal(request.headers.get("api-key"), "fixture-dev-key");
        return Response.json({
          id: 123,
          username: "fixturedev",
          name: "DEV Runtime",
        });
      }
      throw new Error("Unexpected outbound request");
    },
  });
  try {
    const linkedin = await mf.dispatchFetch("https://runtime.test/linkedin");
    const result = await linkedin.json();
    assert.equal(linkedin.status, 200, JSON.stringify(result));
    assert.equal(result.actorId, "urn:li:person:fixture-member");
    const dev = await mf.dispatchFetch("https://runtime.test/dev");
    assert.equal(dev.status, 200);
    assert.equal((await dev.json()).actorId, "123");
    assert.deepEqual(requests, [
      "https://www.linkedin.com/oauth/v2/accessToken",
      "https://api.linkedin.com/v2/userinfo",
      "https://dev.to/api/users/me",
    ]);
  } finally {
    await mf.dispose();
  }
});
