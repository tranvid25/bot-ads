import { body, error } from "../middleware/security.mjs";
import { id, json } from "../lib/http.mjs";
import { discoveredGroup } from "../../../packages/contracts/facebook.mjs";
import { groupCsv } from "../../../packages/contracts/group-csv.mjs";
export async function importGroups(request, env, workspaceId) {
  const input = await body(request, 65000);
  let groups;
  try {
    groups = groupCsv(input.csv).map(discoveredGroup);
  } catch (e) {
    throw error(400, e.message);
  }
  groups = [...new Map(groups.map((g) => [g.url, g])).values()];
  let added = 0;
  for (let start = 0; start < groups.length; start += 50) {
    const results = await env.DB.batch(
      groups
        .slice(start, start + 50)
        .map((g) =>
          env.DB.prepare(
            "INSERT INTO facebook_groups(id,workspace_id,account_key,url,name,source,reason,checked_at,created_at) VALUES (?,?,'import',?,?,'import',?,?,?) ON CONFLICT(workspace_id,account_key,url) DO NOTHING",
          ).bind(
            id(),
            workspaceId,
            g.url,
            g.name,
            g.reason,
            Date.now(),
            Date.now(),
          ),
        ),
    );
    added += results.reduce((sum, r) => sum + (r.meta.changes || 0), 0);
  }
  return json({ added, duplicate: groups.length - added });
}
