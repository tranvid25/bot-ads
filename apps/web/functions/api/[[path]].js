// Keep browser cookies on the Pages origin while the API runs in its own Worker.
// Forward the original URL, Origin, cookies and streaming body without rewriting.
export async function onRequest({ request, env }) {
  if (!env.BACKEND) {
    return Response.json(
      { error: "Chưa kết nối Pages với Worker API BotAds." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    // OAuth redirects must reach the browser with Set-Cookie intact.
    return await env.BACKEND.fetch(
      new Request(request, { redirect: "manual" }),
    );
  } catch {
    return Response.json(
      {
        error:
          "Pages không kết nối được Worker API BotAds. Vui lòng thử lại sau.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
