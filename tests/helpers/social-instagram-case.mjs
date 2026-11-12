import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { dispatchMarketing } from "../../apps/api/services/marketing-publisher.mjs";
import { expireTasks } from "../../apps/api/services/desktop-social/tasks.mjs";
export function register(env) {
  test("Instagram requires a private owned JPG/PNG asset before scheduling", async () => {
    const ctx = env.ctx;
    let channel = env.channel;
    const instagram = await ctx.connect("instagram");
    assert.equal((await ctx.post(instagram)).status, 400);
    const asset = randomUUID();
    await ctx.db
      .prepare(
        "INSERT INTO assets(id,workspace_id,object_key,name,mime,size,created_at) VALUES (?,?,?,'test.png','image/png',50,?)",
      )
      .bind(asset, ctx.a.workspaceId, "private/test", Date.now())
      .run();
    const scheduled = await ctx.post(instagram, asset);
    assert.equal(scheduled.status, 200, JSON.stringify(scheduled.data));
    const task = await ctx.claim();
    assert.equal(task.provider, "instagram");
    await ctx.call("/device/social/forget", { provider: "instagram" });
    assert.equal(
      (await ctx.call("/device/social/before-submit", ctx.taskData(task)))
        .status,
      409,
    );
    await ctx.call("/device/social/report", {
      ...ctx.taskData(task),
      status: "needs_reauth",
      error: "Session removed",
    });
    env.channel = channel;
  });
}
