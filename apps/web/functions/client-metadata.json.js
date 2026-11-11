export async function onRequest({ request, env }) {
  if (env.BACKEND) {
    try {
      const res = await env.BACKEND.fetch(
        new Request("https://api.internal/client-metadata.json", {
          method: "GET",
          headers: request.headers,
        }),
      );
      if (res.status === 200) return res;
    } catch {}
  }
  const meta = {
    client_id: "https://bot.salesora.space/client-metadata.json",
    client_name: "BotSalesOra",
    client_uri: "https://bot.salesora.space",
    logo_uri: "https://bot.salesora.space/brand/logo-512.png",
    tos_uri: "https://bot.salesora.space/terms.html",
    policy_uri: "https://bot.salesora.space/privacy.html",
    redirect_uris: [
      "https://bot.salesora.space/api/marketing/bluesky/callback",
    ],
    scope: "atproto transition:generic",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    application_type: "web",
    token_endpoint_auth_method: "none",
    dpop_bound_access_tokens: true,
  };
  return new Response(JSON.stringify(meta, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
