import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { dispatchMarketing } from "../../apps/api/services/marketing-publisher.mjs";
import { expireTasks } from "../../apps/api/services/desktop-social/tasks.mjs";
export function register(env) {
  test("customers can cancel a pending login without granting or creating a channel", async () => {
    const ctx = env.ctx;
    let channel = env.channel;
    const queued = await ctx.call("/marketing/desktop/start", {
      provider: "threads",
      brandId: ctx.brandId,
    });
    const task = await ctx.claim();
    assert.equal(task.id, queued.data.id);
    assert.equal(
      (await ctx.call(`/marketing/desktop/tasks/${task.id}/cancel`, {}, ctx.b))
        .status,
      409,
    );
    assert.equal(
      (await ctx.call(`/marketing/desktop/tasks/${task.id}/cancel`, {})).status,
      200,
    );
    assert.equal(
      (await ctx.call("/device/social/heartbeat", ctx.taskData(task))).data
        .stop,
      true,
    );
    await ctx.call("/device/social/report", {
      ...ctx.taskData(task),
      status: "connected",
      identity: { actorId: "other" },
    });
    assert.equal(
      (
        await ctx.db
          .prepare(
            "SELECT count(*) AS n FROM marketing_channels WHERE actor_id='other'",
          )
          .first()
      ).n,
      0,
    );
    env.channel = channel;
  });
}
