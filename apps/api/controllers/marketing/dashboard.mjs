import { all, run } from "../../models/database.mjs";
import { json } from "../../lib/http.mjs";
import { marketingCapabilities } from "./config.mjs";
export async function dashboard(request, env, context, execution) {
  const { workspaceId } = context;
  const path = new URL(request.url).pathname,
    method = request.method,
    parts = path.split("/");
  if (path === "/api/marketing" && method === "GET") {
    const fetchChannels = async () => {
      try {
        return await all(
          env,
          "SELECT id,brand_id,provider,actor_id,name,scopes,status,expires_at,avatar_url,transport,device_id FROM marketing_channels WHERE workspace_id=? ORDER BY created_at DESC LIMIT 100",
          workspaceId,
        );
      } catch (err) {
        if (String(err).includes("avatar_url")) {
          try {
            await run(
              env,
              "ALTER TABLE marketing_channels ADD COLUMN avatar_url TEXT DEFAULT ''",
            );
            return await all(
              env,
              "SELECT id,brand_id,provider,actor_id,name,scopes,status,expires_at,avatar_url,transport,device_id FROM marketing_channels WHERE workspace_id=? ORDER BY created_at DESC LIMIT 100",
              workspaceId,
            );
          } catch {}
          const rows = await all(
            env,
            "SELECT id,brand_id,provider,actor_id,name,scopes,status,expires_at FROM marketing_channels WHERE workspace_id=? ORDER BY created_at DESC LIMIT 100",
            workspaceId,
          );
          return rows.map((r) => ({
            ...r,
            avatar_url: "",
          }));
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
      posts: posts.map((p) => ({
        ...p,
        variants: JSON.parse(p.variants),
      })),
      publications: publications.map((p) => ({
        ...p,
        snapshot: JSON.parse(p.snapshot),
        claim_token: undefined,
      })),
      attempts,
      capabilities: marketingCapabilities(env),
    });
  }
}
