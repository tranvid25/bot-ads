import { error } from "../middleware/security.mjs";
import { linkedinReason } from "../../../packages/contracts/linkedin-errors.mjs";

function oauthError(reason) {
  return Object.assign(error(400, "Không hoàn tất được kết nối LinkedIn."), {
    oauthReason: reason,
  });
}
async function oauthJson(response) {
  try {
    const value = await response.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw 0;
    return value;
  } catch {
    throw oauthError("provider_response");
  }
}
export class PublishError extends Error {
  constructor(message, state = "failed", retryAfter = 0) {
    super(message);
    this.state = state;
    this.retryAfter = retryAfter;
  }
}
export async function providerFetch(env, url, init = {}) {
  return (env.PROVIDER_HTTP || { fetch }).fetch(url, {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
  });
}
const devHeaders = (key) => ({
  "api-key": key,
  Accept: "application/vnd.forem.api-v1+json",
  "Content-Type": "application/json",
});
const linkedinHeaders = (env, token) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "LinkedIn-Version": env.LINKEDIN_API_VERSION || "202610",
  "X-Restli-Protocol-Version": "2.0.0",
});
async function requireSuccess(response, submitted = false) {
  if (response.ok) return response;
  if (response.status === 401)
    throw new PublishError(
      "Kết nối đã hết hiệu lực. Hãy kết nối lại tài khoản.",
      "needs_reauth",
    );
  if (response.status === 403)
    throw new PublishError(
      "Nền tảng từ chối quyền đăng. Kiểm tra quyền ứng dụng và tài khoản.",
    );
  if (response.status === 429) {
    const raw = response.headers.get("retry-after");
    const seconds = Number(raw);
    const delay =
      Number.isFinite(seconds) && seconds > 0
        ? seconds * 1000
        : Date.parse(raw) - Date.now();
    throw new PublishError(
      "Đã đạt giới hạn nền tảng. Hệ thống sẽ thử lại sau.",
      "retry_wait",
      Math.max(60000, Math.min(delay || 300000, 86400000)),
    );
  }
  throw new PublishError(
    `Nền tảng trả HTTP ${response.status}. ${submitted && response.status >= 500 ? "Chưa rõ kết quả; cần kiểm tra trước khi gửi lại." : "Kiểm tra nội dung và cấu hình kết nối."}`,
    submitted && response.status >= 500 ? "unknown" : "failed",
  );
}
export async function devIdentity(env, apiKey) {
  let response;
  try {
    response = await providerFetch(env, "https://dev.to/api/users/me", {
      headers: devHeaders(apiKey),
    });
  } catch {
    throw error(502, "Không kết nối được DEV. Vui lòng thử lại.");
  }
  if (!response.ok)
    throw error(
      400,
      "API key DEV không hợp lệ hoặc tài khoản chưa được phép truy cập.",
    );
  const user = await response.json();
  if (!user.id || !user.username)
    throw error(502, "DEV trả thông tin tài khoản không hợp lệ.");
  return {
    actorId: String(user.id),
    name: String(user.name || user.username).slice(0, 100),
  };
}
export async function exchangeLinkedIn(env, code, redirectUri) {
  let response;
  try {
    response = await providerFetch(
      env,
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: env.LINKEDIN_CLIENT_ID.trim(),
          client_secret: env.LINKEDIN_CLIENT_SECRET.trim(),
        }).toString(),
      },
    );
  } catch {
    throw oauthError("network");
  }
  const token = await oauthJson(response);
  if (!response.ok) throw oauthError(linkedinReason(token.error));
  if (
    !token.access_token ||
    !Number.isFinite(Number(token.expires_in)) ||
    Number(token.expires_in) <= 0
  )
    throw oauthError("provider_response");
  if (token.scope && !token.scope.split(/[ ,]+/).includes("w_member_social"))
    throw oauthError("scope");
  let identity;
  try {
    identity = await providerFetch(
      env,
      "https://api.linkedin.com/v2/userinfo",
      { headers: { Authorization: `Bearer ${token.access_token}` } },
    );
  } catch {
    throw oauthError("network");
  }
  if (!identity.ok) throw oauthError("identity");
  const user = await oauthJson(identity);
  if (typeof user.sub !== "string" || !/^[\w-]+$/.test(user.sub))
    throw oauthError("identity");
  return {
    actorId: `urn:li:person:${user.sub}`,
    name: String(user.name || "LinkedIn").slice(0, 100),
    credential: { accessToken: token.access_token },
    expiresAt: Date.now() + Number(token.expires_in) * 1000,
    scopes: token.scope || "openid profile w_member_social",
  };
}
export async function publishToProvider(
  env,
  account,
  credential,
  variant,
  { image, beforeSubmit },
) {
  let prepared;
  const token = credential.accessToken;
  try {
    if (account.provider === "dev") {
      prepared = {
        url: "https://dev.to/api/articles",
        headers: devHeaders(credential.apiKey),
        body: {
          article: {
            title: variant.title,
            body_markdown: variant.content,
            published: true,
            tags: variant.tags,
            ...(variant.canonicalUrl
              ? { canonical_url: variant.canonicalUrl }
              : {}),
            ...(image ? { main_image: image.url } : {}),
          },
        },
      };
    } else if (account.provider === "linkedin") {
      let content;
      if (image) {
        const init = await requireSuccess(
          await providerFetch(
            env,
            "https://api.linkedin.com/rest/images?action=initializeUpload",
            {
              method: "POST",
              headers: linkedinHeaders(env, token),
              body: JSON.stringify({
                initializeUploadRequest: { owner: account.actor_id },
              }),
            },
          ),
        );
        const result = (await init.json()).value;
        const uploadUrl = new URL(result?.uploadUrl);
        if (
          uploadUrl.protocol !== "https:" ||
          uploadUrl.username ||
          uploadUrl.password ||
          !(
            uploadUrl.hostname === "linkedin.com" ||
            uploadUrl.hostname.endsWith(".linkedin.com")
          ) ||
          !/^urn:li:image:/.test(result?.image || "")
        )
          throw new PublishError(
            "LinkedIn trả đường dẫn tải ảnh không hợp lệ.",
          );
        await requireSuccess(
          await providerFetch(env, uploadUrl.href, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": image.mime,
            },
            body: image.bytes,
          }),
        );
        content = { media: { id: result.image, altText: variant.title } };
      }
      prepared = {
        url: "https://api.linkedin.com/rest/posts",
        headers: linkedinHeaders(env, token),
        body: {
          author: account.actor_id,
          commentary: variant.content,
          visibility: "PUBLIC",
          distribution: {
            feedDistribution: "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          lifecycleState: "PUBLISHED",
          isReshareDisabledByAuthor: false,
          ...(content ? { content } : {}),
        },
      };
    } else throw new PublishError("Kênh này cần đăng thủ công.");
  } catch (e) {
    if (e instanceof PublishError) throw e;
    throw new PublishError(
      "Không chuẩn bị được nội dung hoặc ảnh. Chưa gửi bài; có thể thử lại.",
    );
  }
  await beforeSubmit();
  let response;
  try {
    response = await providerFetch(env, prepared.url, {
      method: "POST",
      headers: prepared.headers,
      body: JSON.stringify(prepared.body),
    });
  } catch {
    throw new PublishError(
      "Mất kết nối trong lúc gửi bài. Kiểm tra trên nền tảng trước khi gửi lại.",
      "unknown",
    );
  }
  await requireSuccess(response, true);
  try {
    if (account.provider === "dev") {
      const result = await response.json();
      const url = new URL(result.url);
      if (!result.id || url.protocol !== "https:" || url.hostname !== "dev.to")
        throw 0;
      return { remoteId: String(result.id), permalink: url.href };
    }
    const remoteId = response.headers.get("x-restli-id");
    if (!/^urn:li:(share|ugcPost):[0-9]+$/.test(remoteId || "")) throw 0;
    return {
      remoteId,
      permalink: `https://www.linkedin.com/feed/update/${encodeURIComponent(remoteId)}/`,
    };
  } catch {
    throw new PublishError(
      "Nền tảng đã nhận yêu cầu nhưng thiếu ID/link xác nhận. Không tự gửi lại.",
      "unknown",
    );
  }
}
