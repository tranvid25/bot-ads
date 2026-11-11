import { all, one, run } from "../models/database.mjs";
import { json, id } from "../lib/http.mjs";
import { body, error, hash, rate, token } from "../middleware/security.mjs";

const b64 = (b) =>
  btoa(String.fromCharCode(...new Uint8Array(b)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
import {
  MANUAL_PROVIDERS,
  validateBrand,
  validateMarketingPost,
  validateSchedule,
  validatePermalink,
} from "../../../packages/contracts/marketing.mjs";
import {
  seal,
  unseal,
  vaultReady,
  credentialContext,
} from "../services/marketing-vault.mjs";
import {
  blueskyIdentity,
  devIdentity,
  exchangeLinkedIn,
  createDPoPProof,
  fetchWithDPoP,
} from "../services/marketing-providers.mjs";
import { dispatchMarketing } from "../services/marketing-publisher.mjs";
import {
  linkedinErrors,
  linkedinReason,
} from "../../../packages/contracts/linkedin-errors.mjs";

export function appOrigin(env) {
  try {
    const url = new URL(env.PUBLIC_APP_URL);
    if (
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password ||
      (url.protocol !== "https:" &&
        !(
          url.protocol === "http:" &&
          ["127.0.0.1", "localhost"].includes(url.hostname)
        ))
    )
      throw 0;
    return url.origin;
  } catch {
    throw error(503, "Cần cấu hình PUBLIC_APP_URL là địa chỉ gốc của website.");
  }
}
export function blueskyClientMetadata(env) {
  let origin = "https://bot.salesora.space";
  try {
    const detected = appOrigin(env);
    if (detected) origin = detected;
  } catch {}
  return {
    client_id: `${origin}/client-metadata.json`,
    client_name: "BotSalesOra",
    client_uri: origin,
    logo_uri: `${origin}/brand/logo-512.png`,
    tos_uri: `${origin}/terms.html`,
    policy_uri: `${origin}/privacy.html`,
    redirect_uris: [
      `${origin}/api/marketing/bluesky/callback`,
      "http://127.0.0.1:5173/api/marketing/bluesky/callback",
    ],
    scope: "atproto transition:generic",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    application_type: "web",
    token_endpoint_auth_method: "none",
    dpop_bound_access_tokens: true,
  };
}
export function marketingCapabilities(env) {
  const encryption = vaultReady(env);
  let origin = false;
  try {
    origin = Boolean(appOrigin(env));
  } catch {}
  return {
    encryption,
    dev: encryption && origin,
    bluesky: Boolean(encryption),
    linkedin: Boolean(
      encryption &&
      origin &&
      env.LINKEDIN_CLIENT_ID &&
      env.LINKEDIN_CLIENT_SECRET,
    ),
    manual: true,
    cadenceMinutes: 5,
  };
}
async function owned(env, table, workspaceId, rowId) {
  const allowed = [
    "marketing_brands",
    "marketing_channels",
    "marketing_posts",
    "marketing_publications",
  ];
  if (!allowed.includes(table)) throw new Error("Invalid repository");
  const row = await one(
    env,
    `SELECT * FROM ${table} WHERE id=? AND workspace_id=?`,
    rowId,
    workspaceId,
  );
  if (!row)
    throw error(404, "Không tìm thấy dữ liệu trong không gian của bạn.");
  return row;
}
async function saveChannel(env, workspaceId, brandId, provider, identity) {
  const existing = await one(
    env,
    "SELECT * FROM marketing_channels WHERE workspace_id=? AND brand_id=? AND provider=? AND actor_id=?",
    workspaceId,
    brandId,
    provider,
    identity.actorId,
  );
  const channelId = existing?.id || id();
  if (!existing) {
    const count = await one(
      env,
      "SELECT count(*) AS n FROM marketing_channels WHERE workspace_id=?",
      workspaceId,
    );
    if (count.n >= 100) throw error(400, "Tối đa 100 kết nối mỗi không gian.");
  }
  const credential = identity.credential
    ? await seal(
        env,
        credentialContext({
          workspace_id: workspaceId,
          provider,
          id: channelId,
        }),
        identity.credential,
      )
    : null;
  const avatarUrl =
    typeof identity.avatarUrl === "string"
      ? identity.avatarUrl.slice(0, 500)
      : existing?.avatar_url || "";
  try {
    await run(
      env,
      "INSERT INTO marketing_channels(id,workspace_id,brand_id,provider,actor_id,name,credential,scopes,status,expires_at,avatar_url,created_at) VALUES (?,?,?,?,?,?,?,?,'connected',?,?,?) ON CONFLICT(workspace_id,brand_id,provider,actor_id) DO UPDATE SET name=excluded.name,credential=excluded.credential,scopes=excluded.scopes,status='connected',expires_at=excluded.expires_at,avatar_url=excluded.avatar_url",
      channelId,
      workspaceId,
      brandId,
      provider,
      identity.actorId,
      identity.name,
      credential,
      identity.scopes || "",
      identity.expiresAt || null,
      avatarUrl,
      Date.now(),
    );
  } catch (err) {
    if (String(err).includes("avatar_url")) {
      try {
        await run(env, "ALTER TABLE marketing_channels ADD COLUMN avatar_url TEXT DEFAULT ''");
        await run(
          env,
          "INSERT INTO marketing_channels(id,workspace_id,brand_id,provider,actor_id,name,credential,scopes,status,expires_at,avatar_url,created_at) VALUES (?,?,?,?,?,?,?,?,'connected',?,?,?) ON CONFLICT(workspace_id,brand_id,provider,actor_id) DO UPDATE SET name=excluded.name,credential=excluded.credential,scopes=excluded.scopes,status='connected',expires_at=excluded.expires_at,avatar_url=excluded.avatar_url",
          channelId,
          workspaceId,
          brandId,
          provider,
          identity.actorId,
          identity.name,
          credential,
          identity.scopes || "",
          identity.expiresAt || null,
          avatarUrl,
          Date.now(),
        );
        return channelId;
      } catch {}
      await run(
        env,
        "INSERT INTO marketing_channels(id,workspace_id,brand_id,provider,actor_id,name,credential,scopes,status,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?,'connected',?,?) ON CONFLICT(workspace_id,brand_id,provider,actor_id) DO UPDATE SET name=excluded.name,credential=excluded.credential,scopes=excluded.scopes,status='connected',expires_at=excluded.expires_at",
        channelId,
        workspaceId,
        brandId,
        provider,
        identity.actorId,
        identity.name,
        credential,
        identity.scopes || "",
        identity.expiresAt || null,
        Date.now(),
      );
    } else {
      throw err;
    }
  }
  return channelId;
}
export async function marketingRoute(request, env, context, execution) {
  const { workspaceId } = context;
  const path = new URL(request.url).pathname;
  const method = request.method;
  const parts = path.split("/");
  if (path === "/api/marketing" && method === "GET") {
    const fetchChannels = async () => {
      try {
        return await all(
          env,
          "SELECT id,brand_id,provider,actor_id,name,scopes,status,expires_at,avatar_url FROM marketing_channels WHERE workspace_id=? ORDER BY created_at DESC LIMIT 100",
          workspaceId,
        );
      } catch (err) {
        if (String(err).includes("avatar_url")) {
          try {
            await run(env, "ALTER TABLE marketing_channels ADD COLUMN avatar_url TEXT DEFAULT ''");
            return await all(
              env,
              "SELECT id,brand_id,provider,actor_id,name,scopes,status,expires_at,avatar_url FROM marketing_channels WHERE workspace_id=? ORDER BY created_at DESC LIMIT 100",
              workspaceId,
            );
          } catch {}
          const rows = await all(
            env,
            "SELECT id,brand_id,provider,actor_id,name,scopes,status,expires_at FROM marketing_channels WHERE workspace_id=? ORDER BY created_at DESC LIMIT 100",
            workspaceId,
          );
          return rows.map((r) => ({ ...r, avatar_url: "" }));
        }
        throw err;
      }
    };
    const [brands, channels, posts, publications, attempts] = await Promise.all(
      [
        all(
          env,
          "SELECT * FROM marketing_brands WHERE workspace_id=? ORDER BY created_at DESC LIMIT 50",
          workspaceId,
        ),
        fetchChannels(),
        all(
          env,
          "SELECT * FROM marketing_posts WHERE workspace_id=? ORDER BY updated_at DESC LIMIT 100",
          workspaceId,
        ),
        all(
          env,
          "SELECT p.*,m.visits,m.leads,m.note AS metric_note,m.updated_at AS metric_updated_at FROM marketing_publications p LEFT JOIN marketing_metrics m ON m.publication_id=p.id WHERE p.workspace_id=? ORDER BY p.created_at DESC LIMIT 200",
          workspaceId,
        ),
        all(
          env,
          "SELECT id,publication_id,status,message,created_at FROM marketing_attempts WHERE workspace_id=? ORDER BY created_at DESC LIMIT 100",
          workspaceId,
        ),
      ],
    );
    return json({
      brands,
      channels,
      posts: posts.map((p) => ({ ...p, variants: JSON.parse(p.variants) })),
      publications: publications.map((p) => ({
        ...p,
        snapshot: JSON.parse(p.snapshot),
        claim_token: undefined,
      })),
      attempts,
      capabilities: marketingCapabilities(env),
    });
  }
  await rate(env, `marketing:${workspaceId}`, 120, 3600);
  if (path === "/api/marketing/dispatch" && method === "POST") {
    if (execution?.waitUntil) {
      execution.waitUntil(dispatchMarketing(env, { workspaceId }));
      return json({ queued: true });
    }
    return json(await dispatchMarketing(env, { workspaceId }));
  }
  if (path === "/api/marketing/brands" && method === "POST") {
    const input = validateBrand(await body(request, 8000));
    const count = await one(
      env,
      "SELECT count(*) AS n FROM marketing_brands WHERE workspace_id=?",
      workspaceId,
    );
    if (count.n >= 50)
      throw error(400, "Tối đa 50 thương hiệu trong một không gian.");
    const brandId = id();
    await run(
      env,
      "INSERT INTO marketing_brands VALUES (?,?,?,?,?,?,?,?)",
      brandId,
      workspaceId,
      input.name,
      input.website,
      input.audience,
      input.language,
      input.ctaUrl,
      Date.now(),
    );
    return json({ id: brandId });
  }
  if (path === "/api/marketing/channels/dev" && method === "POST") {
    if (!marketingCapabilities(env).dev)
      throw error(
        503,
        "Chưa cấu hình khóa bảo vệ kết nối hoặc địa chỉ website.",
      );
    await rate(env, `dev-connect:${workspaceId}`, 10, 3600);
    const input = await body(request, 5000);
    await owned(env, "marketing_brands", workspaceId, String(input.brandId));
    if (
      typeof input.apiKey !== "string" ||
      input.apiKey.length < 8 ||
      input.apiKey.length > 1000 ||
      /\s/.test(input.apiKey)
    )
      throw error(400, "Nhập API key DEV hợp lệ.");
    const identity = await devIdentity(env, input.apiKey);
    return json({
      id: await saveChannel(env, workspaceId, input.brandId, "dev", {
        ...identity,
        credential: { apiKey: input.apiKey },
      }),
    });
  }
  if (path === "/api/marketing/channels/bluesky" && method === "POST") {
    await rate(env, `bluesky-connect:${workspaceId}`, 10, 3600);
    const input = await body(request, 5000);
    await owned(env, "marketing_brands", workspaceId, String(input.brandId));
    if (
      typeof input.handle !== "string" ||
      !input.handle.trim() ||
      typeof input.appPassword !== "string" ||
      !input.appPassword.trim()
    )
      throw error(400, "Nhập đầy đủ Handle và App Password Bluesky.");
    const identity = await blueskyIdentity(
      env,
      input.handle,
      input.appPassword,
    );
    return json({
      id: await saveChannel(
        env,
        workspaceId,
        input.brandId,
        "bluesky",
        identity,
      ),
    });
  }
  if (path === "/api/marketing/channels/manual" && method === "POST") {
    const input = await body(request, 5000);
    await owned(env, "marketing_brands", workspaceId, String(input.brandId));
    if (
      !MANUAL_PROVIDERS.includes(input.provider) ||
      typeof input.name !== "string" ||
      !input.name.trim() ||
      input.name.length > 100
    )
      throw error(400, "Chọn kênh và nhập tên tài khoản (tối đa 100 ký tự).");
    return json({
      id: await saveChannel(env, workspaceId, input.brandId, input.provider, {
        actorId: input.name.trim(),
        name: input.name.trim(),
        avatarUrl:
          typeof input.avatarUrl === "string" ? input.avatarUrl.trim() : "",
      }),
    });
  }
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
        ["http://127.0.0.1:8899", "http://localhost:8899"].includes(requestOrigin)
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
    return json({ url: url.href }, 200, {
      "Set-Cookie": `botads_oauth=${browser}; HttpOnly; SameSite=Lax; Path=/api/marketing/linkedin; Max-Age=600${origin.startsWith("https:") ? "; Secure" : ""}`,
    });
  }
  if (path === "/api/marketing/bluesky/start" && method === "POST") {
    if (!marketingCapabilities(env).bluesky)
      throw error(503, "Chưa cấu hình khóa mã hóa bảo vệ kết nối.");
    const input = await body(request, 2000);
    await owned(env, "marketing_brands", workspaceId, String(input.brandId));
    await rate(env, `oauth:${workspaceId}`, 10, 600);
    const origin = appOrigin(env);
    if (!origin)
      throw error(400, "Hãy kết nối Bluesky từ địa chỉ website chính đã cấu hình.");

    const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
    const codeVerifier = b64(verifierBytes);
    const challengeBytes = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(codeVerifier),
    );
    const codeChallenge = b64(challengeBytes);

    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
    const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

    const state = token(),
      browser = token();
    const redirectUri = `${origin}/api/marketing/bluesky/callback`;
    const clientId = origin.startsWith("https:")
      ? `${origin}/client-metadata.json`
      : "https://bot.salesora.space/client-metadata.json";

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

    const parRes = await fetchWithDPoP(
      env,
      parUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: parBody.toString(),
      },
      keyPair.privateKey,
      publicJwk,
    );

    if (!parRes.ok) {
      const errText = await parRes.text();
      console.warn("Bluesky PAR failed:", parRes.status, errText);
      throw error(
        502,
        "Không kết nối được cổng ủy quyền Bluesky. Vui lòng thử lại sau.",
      );
    }

    const parData = await parRes.json();
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

    return json({ url: authUrl.href }, 200, {
      "Set-Cookie": `botads_bsky_oauth=${browser}.${encodeURIComponent(sealedSession)}; HttpOnly; SameSite=Lax; Path=/api/marketing/bluesky; Max-Age=600${origin.startsWith("https:") ? "; Secure" : ""}`,
    });
  }
  if (parts[3] === "channels" && parts.length === 5 && method === "DELETE") {
    await owned(env, "marketing_channels", workspaceId, parts[4]);
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE marketing_channels SET status='disconnected',credential=NULL WHERE id=? AND workspace_id=?",
      ).bind(parts[4], workspaceId),
      env.DB.prepare(
        "UPDATE marketing_publications SET cancel_requested=1,status=CASE WHEN status='publishing' THEN status ELSE 'canceled' END,updated_at=? WHERE channel_id=? AND workspace_id=? AND status IN ('scheduled','retry_wait','needs_reauth','awaiting_manual','publishing')",
      ).bind(Date.now(), parts[4], workspaceId),
    ]);
    return json({ ok: true });
  }
  if (parts[3] === "posts") {
    if (
      (parts.length === 4 && method === "POST") ||
      (parts.length === 5 && method === "PUT")
    ) {
      const input = await body(request, 900000);
      const post = validateMarketingPost(input);
      await owned(env, "marketing_brands", workspaceId, String(input.brandId));
      for (const v of post.variants)
        if (v.assetId) {
          const asset = await one(
            env,
            "SELECT id FROM assets WHERE id=? AND workspace_id=?",
            v.assetId,
            workspaceId,
          );
          if (!asset) throw error(400, "Ảnh không thuộc không gian của bạn.");
        }
      const postId = parts[4] || id();
      if (method === "PUT") {
        const existing = await owned(
          env,
          "marketing_posts",
          workspaceId,
          postId,
        );
        if (existing.brand_id !== input.brandId)
          throw error(400, "Không thể đổi thương hiệu của bài đã tạo.");
        const result = await run(
          env,
          "UPDATE marketing_posts SET title=?,source_url=?,variants=?,status='draft',revision=revision+1,approved_at=NULL,updated_at=? WHERE id=? AND workspace_id=? AND revision=?",
          post.title,
          post.sourceUrl,
          JSON.stringify(post.variants),
          Date.now(),
          postId,
          workspaceId,
          Number(input.revision),
        );
        if (!result.meta.changes)
          throw error(409, "Bài đã thay đổi. Tải lại trước khi lưu.");
      } else {
        const count = await one(
          env,
          "SELECT count(*) AS n FROM marketing_posts WHERE workspace_id=?",
          workspaceId,
        );
        if (count.n >= 100)
          throw error(400, "Bản hiện tại hỗ trợ 100 bài mỗi không gian.");
        await run(
          env,
          "INSERT INTO marketing_posts(id,workspace_id,brand_id,title,source_url,variants,updated_at) VALUES (?,?,?,?,?,?,?)",
          postId,
          workspaceId,
          input.brandId,
          post.title,
          post.sourceUrl,
          JSON.stringify(post.variants),
          Date.now(),
        );
      }
      return json({ id: postId });
    }
    if (parts.length === 6 && parts[5] === "approve" && method === "POST") {
      const input = await body(request, 2000);
      await owned(env, "marketing_posts", workspaceId, parts[4]);
      const result = await run(
        env,
        "UPDATE marketing_posts SET status='approved',approved_at=?,updated_at=? WHERE id=? AND workspace_id=? AND revision=?",
        Date.now(),
        Date.now(),
        parts[4],
        workspaceId,
        Number(input.revision),
      );
      if (!result.meta.changes)
        throw error(
          409,
          "Phiên bản đã thay đổi. Mở lại và duyệt đúng nội dung.",
        );
      return json({ ok: true });
    }
    if (parts.length === 6 && parts[5] === "schedule" && method === "POST") {
      const input = await body(request, 5000);
      const schedule = validateSchedule(input);
      const post = await owned(env, "marketing_posts", workspaceId, parts[4]);
      if (
        post.status !== "approved" ||
        post.revision !== Number(input.revision)
      )
        throw error(409, "Cần duyệt phiên bản hiện tại trước khi đặt lịch.");
      const variants = JSON.parse(post.variants);
      const statements = [];
      for (const channelId of schedule.channelIds) {
        const channel = await owned(
          env,
          "marketing_channels",
          workspaceId,
          channelId,
        );
        if (
          channel.brand_id !== post.brand_id ||
          channel.status !== "connected"
        )
          throw error(
            400,
            "Tài khoản phải đang kết nối và thuộc cùng thương hiệu.",
          );
        if (channel.expires_at && channel.expires_at <= schedule.scheduledAt)
          throw error(
            400,
            "Kết nối sẽ hết hạn trước lịch đăng. Hãy kết nối lại hoặc chọn lịch sớm hơn.",
          );
        const variant = variants.find((v) => v.provider === channel.provider);
        if (!variant)
          throw error(400, `Chưa có nội dung cho ${channel.provider}.`);
        const unresolved = await one(
          env,
          "SELECT scheduled_at FROM marketing_publications WHERE post_id=? AND revision=? AND channel_id=? AND status IN ('scheduled','retry_wait','publishing','unknown','needs_reauth','awaiting_manual')",
          post.id,
          post.revision,
          channelId,
        );
        if (unresolved && unresolved.scheduled_at !== schedule.scheduledAt)
          throw error(
            409,
            "Bản nội dung này đang có lịch hoặc kết quả chưa rõ trên tài khoản đã chọn. Xử lý lượt đó trước khi đặt lịch mới.",
          );
        const snapshot = {
          ...variant,
          postTitle: post.title,
          sourceUrl: post.source_url,
          approvedAt: post.approved_at,
        };
        const status = MANUAL_PROVIDERS.includes(channel.provider)
          ? "awaiting_manual"
          : "scheduled";
        statements.push(
          env.DB.prepare(
            "INSERT INTO marketing_publications(id,workspace_id,post_id,channel_id,revision,snapshot,scheduled_at,status,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM marketing_posts WHERE id=? AND workspace_id=? AND revision=? AND status='approved') AND EXISTS(SELECT 1 FROM marketing_channels WHERE id=? AND status='connected') ON CONFLICT(post_id,revision,channel_id,scheduled_at) DO NOTHING",
          ).bind(
            id(),
            workspaceId,
            post.id,
            channelId,
            post.revision,
            JSON.stringify(snapshot),
            schedule.scheduledAt,
            status,
            Date.now(),
            Date.now(),
            post.id,
            workspaceId,
            post.revision,
            channelId,
          ),
        );
      }
      try {
        await env.DB.batch(statements);
      } catch (e) {
        if (/UNIQUE constraint/.test(String(e)))
          throw error(
            409,
            "Có lượt đăng cùng nội dung đang chờ. Tải lại danh sách trước khi đặt lịch.",
          );
        throw e;
      }
      const publications = await all(
        env,
        "SELECT id,channel_id,status FROM marketing_publications WHERE post_id=? AND workspace_id=? AND revision=? AND scheduled_at=?",
        post.id,
        workspaceId,
        post.revision,
        schedule.scheduledAt,
      );
      if (
        publications.filter((p) => schedule.channelIds.includes(p.channel_id))
          .length !== schedule.channelIds.length
      )
        throw error(
          409,
          "Nội dung hoặc kết nối đã thay đổi. Tải lại rồi đặt lịch.",
        );
      return json({ publications });
    }
  }
  if (parts[3] === "publications" && parts.length === 6 && method === "POST") {
    const publication = await owned(
      env,
      "marketing_publications",
      workspaceId,
      parts[4],
    );
    const input = await body(request, 10000);
    const channel = await owned(
      env,
      "marketing_channels",
      workspaceId,
      publication.channel_id,
    );
    if (parts[5] === "cancel") {
      await run(
        env,
        "UPDATE marketing_publications SET cancel_requested=1,status=CASE WHEN status='publishing' THEN status ELSE 'canceled' END,updated_at=? WHERE id=? AND status IN ('scheduled','retry_wait','awaiting_manual','needs_reauth','publishing')",
        Date.now(),
        publication.id,
      );
      return json({ ok: true });
    }
    if (parts[5] === "confirm") {
      const permalink = validatePermalink(channel.provider, input.permalink);
      const isManual = MANUAL_PROVIDERS.includes(channel.provider);
      const eligible = isManual ? ["awaiting_manual"] : ["unknown"];
      if (!eligible.includes(publication.status))
        throw error(409, "Trạng thái hiện tại không hỗ trợ xác nhận thủ công.");
      const result = await run(
        env,
        "UPDATE marketing_publications SET status='user_reported_published',permalink=?,error=NULL,updated_at=? WHERE id=? AND status=?",
        permalink,
        Date.now(),
        publication.id,
        publication.status,
      );
      if (!result.meta.changes) throw error(409, "Trạng thái đã thay đổi.");
      await run(
        env,
        "INSERT INTO marketing_attempts VALUES (?,?,?,?,?,?,?)",
        id(),
        publication.id,
        workspaceId,
        "user",
        "user_reported_published",
        "Người dùng xác nhận đã đăng bằng permalink; chưa được API kiểm chứng.",
        Date.now(),
      );
      return json({ ok: true });
    }
    if (parts[5] === "retry") {
      if (
        !["failed", "needs_reauth"].includes(publication.status) ||
        channel.status !== "connected" ||
        publication.cancel_requested
      )
        throw error(
          409,
          "Chỉ thử lại lỗi đã rõ kết quả với tài khoản đang kết nối. Bài chưa rõ cần kiểm tra thủ công.",
        );
      const other = await one(
        env,
        "SELECT id FROM marketing_publications WHERE post_id=? AND revision=? AND channel_id=? AND id<>? AND status IN ('scheduled','retry_wait','publishing','unknown','needs_reauth','awaiting_manual')",
        publication.post_id,
        publication.revision,
        publication.channel_id,
        publication.id,
      );
      if (other)
        throw error(
          409,
          "Đã có lượt khác cho nội dung này. Xử lý hoặc hủy lượt đó trước.",
        );
      let result;
      try {
        result = await run(
          env,
          "UPDATE marketing_publications SET status='scheduled',error=NULL,scheduled_at=?,attempt_count=0,updated_at=? WHERE id=? AND status=? AND cancel_requested=0",
          Date.now(),
          Date.now(),
          publication.id,
          publication.status,
        );
      } catch (e) {
        if (/UNIQUE constraint/.test(String(e)))
          throw error(
            409,
            "Có lượt cùng nội dung đang chờ. Tải lại danh sách.",
          );
        throw e;
      }
      if (!result.meta.changes) throw error(409, "Trạng thái đã thay đổi.");
      return json({ ok: true });
    }
    if (parts[5] === "not-posted") {
      if (
        publication.status !== "unknown" ||
        input.checked !== true ||
        typeof input.note !== "string" ||
        input.note.trim().length < 10 ||
        input.note.length > 1000
      )
        throw error(
          400,
          "Cần kiểm tra trực tiếp bài chưa rõ, xác nhận chưa đăng và ghi lý do tối thiểu 10 ký tự.",
        );
      const result = await run(
        env,
        "UPDATE marketing_publications SET status='failed',error='Người dùng đã kiểm tra và xác nhận chưa đăng. Có thể chủ động thử lại.',updated_at=? WHERE id=? AND status='unknown'",
        Date.now(),
        publication.id,
      );
      if (!result.meta.changes) throw error(409, "Trạng thái đã thay đổi.");
      await run(
        env,
        "INSERT INTO marketing_attempts VALUES (?,?,?,?,?,?,?)",
        id(),
        publication.id,
        workspaceId,
        "user",
        "failed",
        `Người dùng xác nhận chưa đăng: ${input.note.trim()}`,
        Date.now(),
      );
      return json({ ok: true });
    }
    if (parts[5] === "metrics") {
      if (
        !["published", "user_reported_published"].includes(publication.status)
      )
        throw error(409, "Chỉ nhập số liệu cho bài đã đăng.");
      if (
        ![input.visits, input.leads].every(
          (v) => Number.isInteger(v) && v >= 0 && v <= 100000000,
        ) ||
        typeof input.note !== "string" ||
        input.note.length > 2000
      )
        throw error(
          400,
          "Nhập số nguyên không âm và ghi chú tối đa 2000 ký tự.",
        );
      await run(
        env,
        "INSERT INTO marketing_metrics VALUES (?,?,?,?,?,?) ON CONFLICT(publication_id) DO UPDATE SET visits=excluded.visits,leads=excluded.leads,note=excluded.note,updated_at=excluded.updated_at",
        publication.id,
        workspaceId,
        input.visits,
        input.leads,
        input.note,
        Date.now(),
      );
      return json({ ok: true });
    }
  }
  throw error(404, "Không tìm thấy chức năng marketing.");
}

export async function linkedinCallback(request, env) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const browser = (request.headers.get("cookie") || "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("botads_oauth="))
    ?.slice(13);
  if (!browser || !/^[a-f0-9]{64}$/.test(state))
    throw error(
      403,
      "Phiên kết nối LinkedIn không hợp lệ. Bắt đầu lại từ website.",
    );
  const pending = await one(
    env,
    "DELETE FROM marketing_oauth_states WHERE state_hash=? AND browser_hash=? AND expires_at>? RETURNING *",
    await hash(state),
    await hash(browser),
    Date.now(),
  );
  if (!pending || new URL(pending.redirect_uri).origin !== appOrigin(env))
    throw error(403, "Yêu cầu kết nối đã hết hạn hoặc đã được sử dụng.");
  let result = "connected";
  let reason = "failed";
  let stage = "exchange";
  try {
    if (url.searchParams.has("error"))
      throw { oauthReason: linkedinReason(url.searchParams.get("error")) };
    const code = url.searchParams.get("code");
    if (!code || code.length > 4000) throw 0;
    const identity = await exchangeLinkedIn(env, code, pending.redirect_uri);
    stage = "storage";
    await saveChannel(
      env,
      pending.workspace_id,
      pending.brand_id,
      "linkedin",
      identity,
    );
  } catch (e) {
    result = "failed";
    reason =
      e?.oauthReason && Object.hasOwn(linkedinErrors, e.oauthReason)
        ? e.oauthReason
        : stage === "storage"
          ? "storage"
          : "failed";
    console.warn("LinkedIn OAuth failed:", reason);
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${appOrigin(env)}/?linkedin=${result}${result === "failed" ? `&linkedin_reason=${reason}` : ""}`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Set-Cookie": `botads_oauth=; HttpOnly; SameSite=Lax; Path=/api/marketing/linkedin; Max-Age=0${url.protocol === "https:" ? "; Secure" : ""}`,
    },
  });
}

export async function blueskyCallback(request, env) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const cookieHeader = request.headers.get("cookie") || "";
  const bskyCookie =
    cookieHeader
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith("botads_bsky_oauth="))
      ?.slice("botads_bsky_oauth=".length) || "";

  const [browser, sealedRaw] = bskyCookie.split(".");

  if (!state || !browser || !sealedRaw) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: `${appOrigin(env)}/?bluesky=failed&bluesky_reason=expired`,
        "Cache-Control": "no-store",
      },
    });
  }

  const pending = await one(
    env,
    "DELETE FROM marketing_oauth_states WHERE state_hash=? AND browser_hash=? AND expires_at>? RETURNING *",
    await hash(state),
    await hash(browser),
    Date.now(),
  );

  if (!pending) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: `${appOrigin(env)}/?bluesky=failed&bluesky_reason=expired`,
        "Cache-Control": "no-store",
      },
    });
  }

  let result = "connected";
  let reason = "failed";

  try {
    if (url.searchParams.has("error")) {
      throw new Error(url.searchParams.get("error"));
    }
    const code = url.searchParams.get("code");
    if (!code) throw new Error("Missing code");

    const sessionPayload = await unseal(
      env,
      credentialContext({
        workspace_id: pending.workspace_id,
        provider: "bluesky_oauth",
        id: state,
      }),
      decodeURIComponent(sealedRaw),
    );

    const tokenUrl = "https://bsky.social/oauth/token";
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: pending.redirect_uri,
      client_id: sessionPayload.clientId,
      code_verifier: sessionPayload.verifier,
    });

    const tokenRes = await fetchWithDPoP(
      env,
      tokenUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenBody.toString(),
      },
      sessionPayload.privateJwk,
      sessionPayload.publicJwk,
    );

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.warn("Bluesky token exchange failed:", tokenRes.status, errText);
      throw new Error("Token exchange failed");
    }

    const tokenData = await tokenRes.json();
    const did = tokenData.sub;

    const profileUrl = `https://bsky.social/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`;
    const profileRes = await fetchWithDPoP(
      env,
      profileUrl,
      { method: "GET" },
      sessionPayload.privateJwk,
      sessionPayload.publicJwk,
      tokenData.access_token,
    );

    let handle = did;
    let avatarUrl = "";
    let displayName = "";

    if (profileRes.ok) {
      const pData = await profileRes.json();
      handle = pData.handle || did;
      avatarUrl = pData.avatar || "";
      displayName = pData.displayName || "";
    }

    const identity = {
      actorId: did,
      name: displayName ? `${displayName} (@${handle})` : `@${handle}`,
      avatarUrl,
      credential: {
        authMode: "oauth",
        did,
        handle,
        tokenData,
        privateJwk: sessionPayload.privateJwk,
        publicJwk: sessionPayload.publicJwk,
        clientId: sessionPayload.clientId,
      },
    };

    await saveChannel(
      env,
      pending.workspace_id,
      pending.brand_id,
      "bluesky",
      identity,
    );
  } catch (err) {
    console.warn("Bluesky OAuth callback error:", err?.message || err);
    result = "failed";
    reason = "oauth_error";
  }

  const destUrl = `${appOrigin(env)}/?bluesky=${result}${result === "failed" ? `&bluesky_reason=${reason}` : ""}`;
  return new Response(null, {
    status: 303,
    headers: {
      Location: destUrl,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Set-Cookie": `botads_bsky_oauth=; HttpOnly; SameSite=Lax; Path=/api/marketing/bluesky; Max-Age=0${url.protocol === "https:" ? "; Secure" : ""}`,
    },
  });
}
export async function marketingMedia(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD")
    throw error(405, "Chỉ hỗ trợ đọc ảnh.");
  const mediaId = new URL(request.url).pathname.split("/").at(-1);
  const row = await one(
    env,
    "SELECT object_key,mime FROM marketing_public_media WHERE id=?",
    mediaId,
  );
  if (!row) throw error(404, "Không tìm thấy ảnh công khai.");
  const object = await env.MEDIA.get(row.object_key);
  if (!object) throw error(404, "Ảnh không còn tồn tại.");
  return new Response(request.method === "HEAD" ? null : object.body, {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "public,max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
