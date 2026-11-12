import { one, run } from "../../models/database.mjs";
import { id } from "../../lib/http.mjs";
import { error } from "../../middleware/security.mjs";
import { seal, credentialContext } from "../../services/marketing-vault.mjs";
export async function saveChannel(
  env,
  workspaceId,
  brandId,
  provider,
  identity,
) {
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
        await run(
          env,
          "ALTER TABLE marketing_channels ADD COLUMN avatar_url TEXT DEFAULT ''",
        );
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
