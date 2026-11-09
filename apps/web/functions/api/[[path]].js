// Keep browser cookies on the Pages origin while the API runs in its own Worker.
// Forward the original URL, Origin, cookies and streaming body without rewriting.
export async function onRequest({ request, env }) {
  if (!env.BACKEND) {
    return Response.json(
      { error: "Chưa kết nối Pages với Worker API BotAds." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  return env.BACKEND.fetch(request);
}
