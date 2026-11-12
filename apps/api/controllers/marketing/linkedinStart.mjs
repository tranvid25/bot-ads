import { run } from "../../models/database.mjs";
import { json } from "../../lib/http.mjs";
import { body, error, hash, rate, token } from "../../middleware/security.mjs";
import { appOrigin } from "./config.mjs";
import { marketingCapabilities } from "./config.mjs";
import { owned } from "./owned.mjs";
export async function linkedinStart(request, env, context, execution) {
  const { workspaceId } = context;
  const path = new URL(request.url).pathname,
    method = request.method,
    parts = path.split("/");
  if (path === "/api/marketing/linkedin/start" && method === "POST") {
    if (!marketingCapabilities(env).linkedin)
      throw error(
        503,
        "Chủ hệ thống cần cấu hình LinkedIn Developer App trước.",
      );
    const input = await body(request, 2000);
    await owned(env, "marketing_brands", workspaceId, String(input.brandId));
    await rate(env, `oauth:${workspaceId}`, 10, 600);
    const state = token(),
      browser = token();
    const origin = appOrigin(env);
    const requestOrigin = new URL(request.url).origin;
    if (
      requestOrigin !== origin &&
      !(
        ["http://127.0.0.1:5173", "http://localhost:5173"].includes(origin) &&
        ["http://127.0.0.1:8899", "http://localhost:8899"].includes(
          requestOrigin,
        )
      )
    )
      throw error(
        400,
        "Hãy kết nối LinkedIn từ địa chỉ website chính đã cấu hình.",
      );
    const redirectUri = `${origin}/api/marketing/linkedin/callback`;
    await run(
      env,
      "INSERT INTO marketing_oauth_states VALUES (?,?,?,?,?,?)",
      await hash(state),
      await hash(browser),
      workspaceId,
      input.brandId,
      redirectUri,
      Date.now() + 600000,
    );
    const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
    for (const [k, v] of Object.entries({
      response_type: "code",
      client_id: env.LINKEDIN_CLIENT_ID.trim(),
      redirect_uri: redirectUri,
      state,
      scope: "openid profile w_member_social",
    }))
      url.searchParams.set(k, v);
    return json(
      {
        url: url.href,
      },
      200,
      {
        "Set-Cookie": `botads_oauth=${browser}; HttpOnly; SameSite=Lax; Path=/api/marketing/linkedin; Max-Age=600${origin.startsWith("https:") ? "; Secure" : ""}`,
      },
    );
  }
}
