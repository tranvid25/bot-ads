import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { dispatchMarketing } from "../../apps/api/services/marketing-publisher.mjs";
import { expireTasks } from "../../apps/api/services/desktop-social/tasks.mjs";
export function register(env) {
  test("cancel, forgotten session and changed account stop before submit", async () => {
    const ctx = env.ctx;
    let channel = env.channel;
    await ctx.post(channel);
    const task = await ctx.claim(),
      data = ctx.taskData(task);
    await ctx.call(`/marketing/publications/${task.id}/cancel`, {});
    assert.equal(
      (await ctx.call("/device/social/heartbeat", data)).data.stop,
      true,
    );
    assert.equal(
      (await ctx.call("/device/social/before-submit", data)).status,
      409,
    );
    assert.equal(
      (
        await ctx.call("/device/social/report", {
          ...data,
          status: "failed",
          error: "Canceled before clicking",
        })
      ).status,
      200,
    );
    await ctx.call("/device/social/forget", { provider: "threads" });
    assert.equal(
      (
        await ctx.db
          .prepare("SELECT status FROM marketing_channels WHERE id=?")
          .bind(channel.id)
          .first()
      ).status,
      "needs_reauth",
    );
    env.channel = channel;
  });
}
