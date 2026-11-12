import { one, run } from "../../models/database.mjs";
import { id, maxDaily } from "../../lib/http.mjs";
import { fail } from "./config.mjs";
export async function resolveUser(env, profile, pending) {
  const linked = await one(
    env,
    "SELECT user_id FROM auth_identities WHERE provider='google' AND subject=?",
    profile.subject,
  );
  if (pending.user_id) {
    const session = await one(
      env,
      "SELECT user_id FROM sessions WHERE token_hash=? AND user_id=? AND expires_at>?",
      pending.session_hash,
      pending.user_id,
      Date.now(),
    );
    if (!session) throw fail("state");
    if (linked && linked.user_id !== pending.user_id) throw fail("conflict");
    const other = await one(
      env,
      "SELECT subject FROM auth_identities WHERE provider='google' AND user_id=?",
      pending.user_id,
    );
    if (other && other.subject !== profile.subject) throw fail("conflict");
    let saved;
    try {
      saved = await run(
        env,
        "INSERT INTO auth_identities(provider,subject,user_id,email,picture,created_at) VALUES ('google',?,?,?,?,?) ON CONFLICT(provider,subject) DO UPDATE SET email=excluded.email, picture=coalesce(excluded.picture, auth_identities.picture) WHERE auth_identities.user_id=excluded.user_id",
        profile.subject,
        pending.user_id,
        profile.email,
        profile.picture || null,
        Date.now(),
      );
    } catch (e) {
      if (String(e).includes("picture")) {
        saved = await run(
          env,
          "INSERT INTO auth_identities(provider,subject,user_id,email,created_at) VALUES ('google',?,?,?,?) ON CONFLICT(provider,subject) DO UPDATE SET email=excluded.email WHERE auth_identities.user_id=excluded.user_id",
          profile.subject,
          pending.user_id,
          profile.email,
          Date.now(),
        );
      } else throw e;
    }
    if (!saved.meta.changes) throw fail("conflict");
    return pending.user_id;
  }
  if (linked) {
    if (profile.picture) {
      await run(
        env,
        "UPDATE auth_identities SET picture=? WHERE provider='google' AND subject=?",
        profile.picture,
        profile.subject,
      ).catch(() => null);
    }
    return linked.user_id;
  }
  if (await one(env, "SELECT id FROM users WHERE email=?", profile.email))
    throw fail("link_required");
  if (env.ALLOW_REGISTRATION !== "true") throw fail("registration_closed");
  const userId = id(),
    workspaceId = id();
  try {
    // Empty hash cannot authenticate via password; no generated password is shared.
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO users(id,email,name,password_hash,salt,created_at) VALUES (?,?,?,'','',?)",
      ).bind(userId, profile.email, profile.name, Date.now()),
      env.DB.prepare(
        "INSERT INTO workspaces(id,owner_id,daily_limit) VALUES (?,?,?)",
      ).bind(workspaceId, userId, Math.min(30, maxDaily(env))),
      env.DB.prepare(
        "INSERT INTO auth_identities(provider,subject,user_id,email,picture,created_at) VALUES ('google',?,?,?,?,?)",
      ).bind(
        profile.subject,
        userId,
        profile.email,
        profile.picture || null,
        Date.now(),
      ),
    ]);
  } catch (e) {
    if (String(e).includes("picture")) {
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO users(id,email,name,password_hash,salt,created_at) VALUES (?,?,?,'','',?)",
        ).bind(userId, profile.email, profile.name, Date.now()),
        env.DB.prepare(
          "INSERT INTO workspaces(id,owner_id,daily_limit) VALUES (?,?,?)",
        ).bind(workspaceId, userId, Math.min(30, maxDaily(env))),
        env.DB.prepare(
          "INSERT INTO auth_identities(provider,subject,user_id,email,created_at) VALUES ('google',?,?,?,?)",
        ).bind(profile.subject, userId, profile.email, Date.now()),
      ]);
    } else if (!String(e).includes("UNIQUE")) throw e;
    const concurrent = await one(
      env,
      "SELECT user_id FROM auth_identities WHERE provider='google' AND subject=?",
      profile.subject,
    );
    if (concurrent) return concurrent.user_id;
    throw fail("link_required");
  }
  return userId;
}
