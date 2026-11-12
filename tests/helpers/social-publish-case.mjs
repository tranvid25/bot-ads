import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { dispatchMarketing } from "../../apps/api/services/marketing-publisher.mjs";
import { expireTasks } from "../../apps/api/services/desktop-social/tasks.mjs";
export function register(env) {
  test("cloud dispatcher ignores desktop publications; reserve is one-time and link evidence is required", async () => {
    const ctx = env.ctx;
    let channel = env.channel;
    const scheduled = await ctx.post(channel);
    assert.equal(scheduled.status, 200, JSON.stringify(scheduled.data));
    assert.equal(scheduled.data.publications[0].status, "scheduled");
    assert.equal(
      (
        await dispatchMarketing(
          { DB: ctx.db },
          { workspaceId: ctx.a.workspaceId },
        )
      ).processed,
      0,
    );
    const task = await ctx.claim();
    assert.equal(task.kind, "publish");
    const data = ctx.taskData(task);
    assert.equal(
      (await ctx.call("/device/social/before-submit", data, ctx.b)).status,
      404,
    );
    assert.equal(
      (
        await ctx.call("/device/social/report", {
          ...data,
          status: "published",
          permalink: "https://www.threads.com/@threadsfixture/post/abc",
        })
      ).status,
      400,
    );
    assert.equal(
      (await ctx.call("/device/social/before-submit", data)).status,
      200,
    );
    assert.equal(
      (await ctx.call("/device/social/before-submit", data)).status,
      409,
    );
    assert.equal(
      (
        await ctx.call("/device/social/report", {
          ...data,
          status: "published",
          permalink: "https://evil.test/post/abc",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await ctx.call("/device/social/report", {
          ...data,
          status: "published",
          permalink: "https://www.threads.com/@other/post/abc",
        })
      ).status,
      400,
    );
    const result = {
      ...data,
      status: "published",
      permalink: "https://www.threads.com/@threadsfixture/post/abc",
    };
    assert.equal((await ctx.call("/device/social/report", result)).status, 200);
    assert.equal((await ctx.call("/device/social/report", result)).status, 200);
    const row = await ctx.db
      .prepare("SELECT * FROM marketing_publications WHERE id=?")
      .bind(task.id)
      .first();
    assert.equal(row.status, "published");
    assert.equal(row.remote_id, "abc");
    assert.equal(
      (
        await ctx.db
          .prepare(
            "SELECT count(*) AS n FROM marketing_attempts WHERE publication_id=?",
          )
          .bind(task.id)
          .first()
      ).n,
      1,
    );
    env.channel = channel;
  });
}
