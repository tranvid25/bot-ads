import { run } from "../../models/database.mjs";
import { json } from "../../lib/http.mjs";
import { body, error, hash, rate, token } from "../../middleware/security.mjs";
import { seal, credentialContext } from "../../services/marketing-vault.mjs";
import { fetchWithDPoP } from "../../services/marketing-providers.mjs";
import { appOrigin } from "./config.mjs";
import { blueskyOAuthClientId } from "./config.mjs";
import { marketingCapabilities } from "./config.mjs";
import { owned } from "./owned.mjs";
import { b64 } from "./config.mjs";
export async function blueskyStart(request, env, context, execution) {
  const { workspaceId } = context;
  const path = new URL(request.url).pathname,
    method = request.method,
    parts = path.split("/");
  if (path === "/api/marketing/bluesky/start" && method === "POST") {
    if (!marketingCapabilities(env).bluesky)
      throw error(503, "Chưa cấu hình khóa mã hóa bảo vệ kết nối.");
    const input = await body(request, 2000);
    await owned(env, "marketing_brands", workspaceId, String(input.brandId));
    await rate(env, `oauth:${workspaceId}`, 10, 600);
    const origin = appOrigin(env);
    if (
      new URL(request.url).origin !== origin &&
      !(
        origin === "http://127.0.0.1:5173" &&
        new URL(request.url).origin === "http://127.0.0.1:8899"
      )
    )
      throw error(
        400,
        "Hãy kết nối Bluesky từ địa chỉ website chính đã cấu hình.",
      );
    const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
    const codeVerifier = b64(verifierBytes);
    const challengeBytes = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(codeVerifier),
    );
    const codeChallenge = b64(challengeBytes);
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["sign", "verify"],
    );
    const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const state = token(),
      browser = token();
    const redirectUri = `${origin}/api/marketing/bluesky/callback`;
    const clientId = blueskyOAuthClientId(origin);
    const parUrl = "https://bsky.social/oauth/par";
    const parBody = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      redirect_uri: redirectUri,
      scope: "atproto transition:generic",
      state,
    });
    let parRes;
    try {
      parRes = await fetchWithDPoP(
        env,
        parUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: parBody.toString(),
        },
        keyPair.privateKey,
        publicJwk,
      );
    } catch {
      throw error(
        502,
        "Không gọi được dịch vụ ủy quyền Bluesky. Vui lòng thử lại sau.",
      );
    }
    if (!parRes.ok) {
      const details = await parRes.json().catch(() => ({}));
      const code = [
        "invalid_redirect_uri",
        "invalid_client_metadata",
        "invalid_client",
        "invalid_scope",
        "use_dpop_nonce",
      ].includes(details?.error)
        ? details.error
        : "authorization_failed";
      console.warn("Bluesky PAR failed:", parRes.status, code);
      throw error(
        502,
        code === "invalid_redirect_uri"
          ? "Bluesky từ chối callback: client web production chỉ được khai báo callback HTTPS, không chứa URL local. Cần deploy lại client-metadata.json đúng cấu hình."
          : code === "invalid_client_metadata" || code === "invalid_client"
            ? "Bluesky không chấp nhận client-metadata.json. Kiểm tra file JSON công khai, client_id và callback cùng domain."
            : `Không kết nối được cổng ủy quyền Bluesky (HTTP ${parRes.status}, ${code}). Vui lòng thử lại sau.`,
      );
    }
    const parData = await parRes.json().catch(() => null);
    if (
      typeof parData?.request_uri !== "string" ||
      !parData.request_uri.startsWith("urn:ietf:params:oauth:request_uri:")
    )
      throw error(
        502,
        "Bluesky trả phản hồi ủy quyền không hợp lệ. Vui lòng thử lại.",
      );
    const requestUri = parData.request_uri;
    const sessionPayload = {
      verifier: codeVerifier,
      privateJwk,
      publicJwk,
      clientId,
    };
    const sealedSession = await seal(
      env,
      credentialContext({
        workspace_id: workspaceId,
        provider: "bluesky_oauth",
        id: state,
      }),
      sessionPayload,
    );
    const authUrl = new URL("https://bsky.social/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("request_uri", requestUri);
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
    return json(
      {
        url: authUrl.href,
      },
      200,
      {
        "Set-Cookie": `botads_bsky_oauth=${browser}.${encodeURIComponent(sealedSession)}; HttpOnly; SameSite=Lax; Path=/api/marketing/bluesky; Max-Age=600${origin.startsWith("https:") ? "; Secure" : ""}`,
      },
    );
  }
}
