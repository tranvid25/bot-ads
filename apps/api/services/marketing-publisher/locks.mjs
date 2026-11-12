import { one, run } from "../../models/database.mjs";
import { id } from "../../lib/http.mjs";
export async function lock(env, provider, actor, publicationId) {
  return one(
    env,
    "INSERT INTO marketing_account_slots(provider,actor_id,owner_token,until_at) VALUES (?,?,?,?) ON CONFLICT(provider,actor_id) DO UPDATE SET owner_token=excluded.owner_token,until_at=excluded.until_at WHERE marketing_account_slots.until_at<=? RETURNING owner_token",
    provider,
    actor,
    publicationId,
    Date.now() + 180000,
    Date.now(),
  );
}
export async function release(env, provider, actor, publicationId, delay = 0) {
  await run(
    env,
    "UPDATE marketing_account_slots SET until_at=? WHERE provider=? AND actor_id=? AND owner_token=?",
    Date.now() + delay,
    provider,
    actor,
    publicationId,
  );
}
export async function event(env, p, state, message) {
  await run(
    env,
    "INSERT INTO marketing_attempts VALUES (?,?,?,?,?,?,?)",
    id(),
    p.id,
    p.workspace_id,
    p.claim_token,
    state,
    message,
    Date.now(),
  );
}
