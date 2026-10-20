import { route } from "./routes/index.mjs";
import { json } from "./lib/http.mjs";
import { scheduled } from "./services/jobs.service.mjs";
export { scheduled };
export default {
  async fetch(request, env) {
    let response;
    try {
      response = await route(request, env);
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error("API failure:", e.message);
      response = json(
        {
          error:
            status === 500
              ? "Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại."
              : e.message,
        },
        status,
      );
    }
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "same-origin");
    headers.set("X-Frame-Options", "DENY");
    headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    );
    return new Response(response.body, { status: response.status, headers });
  },
  async scheduled(_event, env) {
    await scheduled(env);
  },
};
