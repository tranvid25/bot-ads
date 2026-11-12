import { one, run } from "../../models/database.mjs";
import { json, id } from "../../lib/http.mjs";
import { body, error } from "../../middleware/security.mjs";
import { validateBrand } from "../../../../packages/contracts/marketing.mjs";
export async function brands(request, env, context, execution) {
  const { workspaceId } = context;
  const path = new URL(request.url).pathname,
    method = request.method,
    parts = path.split("/");
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
    return json({
      id: brandId,
    });
  }
}
