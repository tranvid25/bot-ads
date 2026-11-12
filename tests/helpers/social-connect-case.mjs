import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { dispatchMarketing } from "../../apps/api/services/marketing-publisher.mjs";
import { expireTasks } from "../../apps/api/services/desktop-social/tasks.mjs";
export function register(env) {
  test("desktop connections require capable paired device and verified device identity, not typed handles", async () => {
    const ctx = env.ctx;
    let channel = env.channel;
    const wrong = await ctx.call(
      "/marketing/desktop/start",
      { provider: "threads", brandId: ctx.brandId },
      ctx.b,
    );
    assert.equal(wrong.status, 404);
    assert.equal(
      (
        await ctx.call("/marketing/channels/manual", {
          provider: "threads",
          brandId: ctx.brandId,
          name: "pretend",
        })
      ).status,
      409,
    );
    channel = await ctx.connect("threads");
    assert.equal(channel.transport, "desktop");
    assert.equal(channel.actor_id, "threadsfixture");
    assert.equal(channel.device_id, ctx.a.deviceId);
    assert.equal(channel.credential, null);
    assert.equal(
      (await ctx.call("/device/social/claim", {}, ctx.b)).data.task,
      null,
    );
    env.channel = channel;
  });
}
