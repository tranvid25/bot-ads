import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
export function register(env) {
  const { call, campaign, accountKey } = env;
  test("discovery validates input, claims once, blocks normal posting and isolates owners", async () => {
    let { worker, a, b, task, group } = env.state;
    assert.equal(
      (await call("/facebook/discover", { keywords: "bad" })).status,
      400,
    );
    assert.equal(
      (await call("/facebook/discover", { keywords: ["website"], limit: 0 }))
        .status,
      400,
    );
    const created = await call("/facebook/discover", {
      keywords: ["website"],
      limit: 10,
    });
    assert.equal(created.status, 200);
    task = created.data.id;
    assert.equal(
      (await call("/facebook/discover", { keywords: ["website"] })).status,
      409,
    );
    assert.equal(
      (await call("/device/discovery/claim", { accountKey }, b)).data.task,
      null,
    );
    const claimed = await call("/device/discovery/claim", { accountKey });
    assert.equal(claimed.data.task.id, task);
    assert.equal(
      (await call("/device/discovery/claim", { accountKey })).data.task,
      null,
    );
    assert.equal((await call("/device/claim", {})).data.job, null);
    assert.equal(
      (
        await call(
          "/device/discovery/report",
          { taskId: task, groups: [], sequence: 1, finished: true },
          b,
        )
      ).status,
      404,
    );
    Object.assign(env.state, { worker, a, b, task, group });
  });
}
