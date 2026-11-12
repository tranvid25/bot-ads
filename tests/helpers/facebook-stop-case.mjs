import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
export function register(env) {
  const { call, campaign, accountKey } = env;
  test("expired lease and cancellation stop reports; empty discovery completes without publishing", async () => {
    let { worker, a, b, task, group } = env.state;
    const created = await call("/facebook/discover", { keywords: ["website"] });
    await call("/device/discovery/claim", { accountKey });
    await worker.db
      .prepare("UPDATE facebook_discovery_jobs SET lease_until=0 WHERE id=?")
      .bind(created.data.id)
      .run();
    assert.equal(
      (await call("/device/discovery/heartbeat", { taskId: created.data.id }))
        .data.stop,
      true,
    );
    assert.equal(
      (
        await call("/device/discovery/report", {
          taskId: created.data.id,
          groups: [],
          sequence: 1,
          finished: true,
        })
      ).status,
      409,
    );
    const next = await call("/facebook/discover", { keywords: ["website"] });
    await call("/device/discovery/claim", { accountKey });
    await call("/facebook/tasks/" + next.data.id, {});
    assert.equal(
      (await call("/device/discovery/heartbeat", { taskId: next.data.id })).data
        .stop,
      true,
    );
    const empty = await call("/facebook/discover", { keywords: ["website"] });
    await call("/device/discovery/claim", { accountKey });
    assert.equal(
      (
        await call("/device/discovery/report", {
          taskId: empty.data.id,
          groups: [],
          sequence: 1,
          finished: true,
        })
      ).status,
      200,
    );
    assert.equal(
      (await worker.db.prepare("SELECT count(*) AS n FROM attempts").first()).n,
      0,
    );
    Object.assign(env.state, { worker, a, b, task, group });
  });
}
