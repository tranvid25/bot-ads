import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { dispatchMarketing } from "../../apps/api/services/marketing-publisher.mjs";
import { expireTasks } from "../../apps/api/services/desktop-social/tasks.mjs";
export function register(env) {
  test("Facebook and desktop social claims cannot run concurrently in the same workspace", async () => {
    const ctx = env.ctx;
    let channel = env.channel;
    await ctx.call("/marketing/desktop/start", {
      provider: "threads",
      brandId: ctx.brandId,
    });
    const campaign = await ctx.call("/campaigns", {
      name: "Cross-lock test",
      mode: "manual",
      keywords: ["website"],
      dailyLimit: 3,
      posts: [{ id: "post", content: "Website service", selected: true }],
    });
    assert.equal(campaign.status, 200);
    await ctx.call(`/campaigns/${campaign.data.id}/run`, {});
    const [social, facebook] = await Promise.all([
      ctx.call("/device/social/claim", {}),
      ctx.call("/device/claim", {}),
    ]);
    assert.equal(Number(!!social.data.task) + Number(!!facebook.data.job), 1);
    env.channel = channel;
  });
}
