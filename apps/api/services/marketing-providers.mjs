import { error } from "../middleware/security.mjs";
import { linkedinReason } from "../../../packages/contracts/linkedin-errors.mjs";

const b64 = (b) =>
  btoa(String.fromCharCode(...new Uint8Array(b)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const strB64 = (s) => b64(new TextEncoder().encode(s));

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
export async function createDPoPProof(
  privateJwkOrKey,
  publicJwk,
  htm,
  htu,
  nonce = null,
  accessToken = null,
) {
  let privateKey = privateJwkOrKey;
  if (!privateKey?.type) {
    privateKey = await crypto.subtle.importKey(
      "jwk",
      privateJwkOrKey,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );
  }
  const cleanPublicJwk = {
    kty: publicJwk.kty,
    crv: publicJwk.crv,
    x: publicJwk.x,
    y: publicJwk.y,
  };
  const header = { alg: "ES256", typ: "dpop+jwt", jwk: cleanPublicJwk };
  const payload = {
    jti: crypto.randomUUID(),
    htm,
    htu: htu.split("?")[0].split("#")[0],
    iat: Math.floor(Date.now() / 1000),
  };
  if (nonce) payload.nonce = nonce;
  if (accessToken)
    payload.ath = b64(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(accessToken),
      ),
    );

  const headerB64 = strB64(JSON.stringify(header));
  const payloadB64 = strB64(JSON.stringify(payload));
  const toSign = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    toSign,
  );
  return `${headerB64}.${payloadB64}.${b64(sig)}`;
}

export async function fetchWithDPoP(
  env,
  url,
  options = {},
  privateJwkOrKey,
  publicJwk,
  accessToken = null,
) {
  const method = (options.method || "GET").toUpperCase();
  let nonce = options.nonce || null;
  let dpop = await createDPoPProof(
    privateJwkOrKey,
    publicJwk,
    method,
    url,
    nonce,
    accessToken,
  );
  const headers = new Headers(options.headers || {});
  headers.set("DPoP", dpop);
  if (accessToken) {
    headers.set("Authorization", `DPoP ${accessToken}`);
  }

  let res = await providerFetch(env, url, { ...options, headers });
  if (res.status === 400 || res.status === 401) {
    const serverNonce = res.headers.get("dpop-nonce");
    if (serverNonce && serverNonce !== nonce) {
      dpop = await createDPoPProof(
        privateJwkOrKey,
        publicJwk,
        method,
        url,
        serverNonce,
        accessToken,
      );
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set("DPoP", dpop);
      if (accessToken) {
        retryHeaders.set("Authorization", `DPoP ${accessToken}`);
      }
      res = await providerFetch(env, url, {
        ...options,
        headers: retryHeaders,
      });
    }
  }
  return res;
}

export class PublishError extends Error {
  constructor(message, state = "failed", retryAfter = 0) {
    super(message);
    this.state = state;
    this.retryAfter = retryAfter;
  }
}
export async function providerFetch(env, url, init = {}) {
  const options = {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
  };
  // Workers' global fetch requires its original receiver. Placing it on an
  // arbitrary object throws Illegal invocation before any HTTP request is sent.
  if (env.PROVIDER_HTTP) return env.PROVIDER_HTTP.fetch(url, options);
  return fetch(url, options);
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
    avatarUrl:
      typeof user.profile_image === "string"
        ? user.profile_image.slice(0, 500)
        : "",
  };
}
export async function blueskyIdentity(env, handle, appPassword) {
  const clean = handle.trim().replace(/^@/, "");
  let response;
  try {
    response = await providerFetch(
      env,
      "https://bsky.social/xrpc/com.atproto.server.createSession",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: clean,
          password: appPassword.trim(),
        }),
      },
    );
  } catch {
    throw error(502, "Không kết nối được Bluesky. Vui lòng kiểm tra mạng.");
  }
  if (!response.ok) {
    throw error(
      400,
      "Tên tài khoản hoặc Mật khẩu ứng dụng Bluesky không đúng.",
    );
  }
  const session = await response.json();
  if (!session.did || !session.handle) {
    throw error(502, "Bluesky trả thông tin phiên không hợp lệ.");
  }
  let avatarUrl = "";
  try {
    const profRes = await providerFetch(
      env,
      `https://bsky.social/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(session.did)}`,
      { headers: { Authorization: `Bearer ${session.accessJwt}` } },
    );
    if (profRes.ok) {
      const prof = await profRes.json();
      if (typeof prof.avatar === "string")
        avatarUrl = prof.avatar.slice(0, 500);
    }
  } catch {}
  return {
    actorId: session.did,
    name: `@${session.handle}`,
    avatarUrl,
    credential: {
      did: session.did,
      handle: session.handle,
      appPassword: appPassword.trim(),
    },
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
    avatarUrl:
      typeof user.picture === "string" ? user.picture.slice(0, 500) : "",
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
    } else if (account.provider === "bluesky") {
      let sessionToken =
        credential.accessJwt || credential.tokenData?.access_token;
      let dpopProof = null;
      if (
        credential.authMode === "oauth" &&
        credential.privateJwk &&
        credential.publicJwk
      ) {
        sessionToken = credential.tokenData?.access_token;
        dpopProof = await createDPoPProof(
          credential.privateJwk,
          credential.publicJwk,
          "POST",
          "https://bsky.social/xrpc/com.atproto.repo.createRecord",
          null,
          sessionToken,
        );
      } else if (credential.handle && credential.appPassword) {
        try {
          const fresh = await providerFetch(
            env,
            "https://bsky.social/xrpc/com.atproto.server.createSession",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                identifier: credential.handle,
                password: credential.appPassword,
              }),
            },
          );
          if (fresh.ok) {
            const fData = await fresh.json();
            sessionToken = fData.accessJwt;
          }
        } catch {}
      }
      let embed;
      if (image?.bytes && image?.mime) {
        try {
          const blobHeaders = {
            "Content-Type": image.mime,
          };
          if (
            credential.authMode === "oauth" &&
            credential.privateJwk &&
            credential.publicJwk
          ) {
            blobHeaders["Authorization"] = `DPoP ${sessionToken}`;
            blobHeaders["DPoP"] = await createDPoPProof(
              credential.privateJwk,
              credential.publicJwk,
              "POST",
              "https://bsky.social/xrpc/com.atproto.repo.uploadBlob",
              null,
              sessionToken,
            );
          } else {
            blobHeaders["Authorization"] = `Bearer ${sessionToken}`;
          }
          const blobRes = await providerFetch(
            env,
            "https://bsky.social/xrpc/com.atproto.repo.uploadBlob",
            {
              method: "POST",
              headers: blobHeaders,
              body: image.bytes,
            },
          );
          if (blobRes.ok) {
            const bData = await blobRes.json();
            if (bData.blob) {
              embed = {
                $type: "app.bsky.embed.images",
                images: [{ alt: variant.title || "", image: bData.blob }],
              };
            }
          }
        } catch {}
      }
      const text =
        (variant.title ? `${variant.title}\n\n` : "") + (variant.content || "");
      const record = {
        $type: "app.bsky.feed.post",
        text: text.slice(0, 3000),
        createdAt: new Date().toISOString(),
        ...(embed ? { embed } : {}),
      };
      const postHeaders = {
        "Content-Type": "application/json",
      };
      if (dpopProof) {
        postHeaders["Authorization"] = `DPoP ${sessionToken}`;
        postHeaders["DPoP"] = dpopProof;
      } else {
        postHeaders["Authorization"] = `Bearer ${sessionToken}`;
      }
      prepared = {
        url: "https://bsky.social/xrpc/com.atproto.repo.createRecord",
        headers: postHeaders,
        body: {
          repo: credential.did || account.actor_id,
          collection: "app.bsky.feed.post",
          record,
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
    if (account.provider === "bluesky") {
      const result = await response.json();
      const rkey = result.uri?.split("/").pop() || "";
      const handle =
        credential.handle || account.name.replace(/^@/, "") || "user";
      return {
        remoteId: result.uri || result.cid || "",
        permalink: `https://bsky.app/profile/${handle}/post/${rkey}`,
      };
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
