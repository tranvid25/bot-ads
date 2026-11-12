import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { dispatchMarketing } from "../../apps/api/services/marketing-publisher.mjs";
import { expireTasks } from "../../apps/api/services/desktop-social/tasks.mjs";
export function register(env) {
  test("lease loss after reservation is unknown and never auto retried; customer can reconcile with a link", async () => {
    const ctx = env.ctx;
    let channel = env.channel;
    assert.equal((await ctx.post(channel)).status, 200);
    const task = await ctx.claim(),
      data = ctx.taskData(task);
    await ctx.call("/device/social/before-submit", data);
    await ctx.db
      .prepare("UPDATE desktop_social_tasks SET lease_until=0 WHERE id=?")
      .bind(task.id)
      .run();
    await expireTasks({ DB: ctx.db });
    assert.equal(
      (
        await ctx.db
          .prepare("SELECT status FROM marketing_publications WHERE id=?")
          .bind(task.id)
          .first()
      ).status,
      "unknown",
    );
    assert.equal((await ctx.call("/device/social/claim", {})).data.task, null);
    const confirmation = await ctx.call(
      `/marketing/publications/${task.id}/confirm`,
      { permalink: "https://www.threads.com/@threadsfixture/post/reconciled" },
    );
    assert.equal(confirmation.status, 200, JSON.stringify(confirmation.data));
    env.channel = channel;
  });
}
