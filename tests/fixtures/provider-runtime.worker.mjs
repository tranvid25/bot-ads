import {
  exchangeLinkedIn,
  devIdentity,
} from "../../apps/api/services/marketing-providers.mjs";

// No PROVIDER_HTTP binding: exercise Workers' real global fetch implementation.
export default {
  async fetch(request, env) {
    try {
      const result =
        new URL(request.url).pathname === "/dev"
          ? await devIdentity(env, "fixture-dev-key")
          : await exchangeLinkedIn(
              env,
              "fixture-code",
              "https://bot.salesora.space/api/marketing/linkedin/callback",
            );
      return Response.json(result);
    } catch (e) {
      return Response.json(
        { error: e.message, reason: e.oauthReason },
        { status: 500 },
      );
    }
  },
};
