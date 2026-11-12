import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
export function register(env) {
  const { call, campaign, accountKey } = env;
  test("discovery reports are idempotent, normalized and require explicit approval", async () => {
    let { worker, a, b, task, group } = env.state;
    const report = {
      taskId: task,
      sequence: 1,
      groups: [
        {
          url: "https://facebook.com/groups/website?ref=search",
          name: "Website owners",
          membership: "joined",
          reason: "Review rules",
        },
      ],
      finished: true,
    };
    assert.equal((await call("/device/discovery/report", report)).status, 200);
    assert.equal((await call("/device/discovery/report", report)).status, 200);
    const library = (await call("/facebook", undefined, a, "GET")).data;
    assert.equal(library.groups.length, 1);
    group = library.groups[0];
    assert.equal(group.url, "https://www.facebook.com/groups/website");
    assert.equal(group.eligibility, "unreviewed");
    assert.equal(library.tasks[0].groups_seen, 1);
    assert.equal(
      (await call("/facebook", undefined, b, "GET")).data.groups.length,
      0,
    );
    assert.equal(
      (
        await call(
          "/facebook/groups/" + group.id,
          { eligibility: "approved" },
          a,
          "PUT",
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await call(
          "/facebook/groups/" + group.id,
          { eligibility: "approved", confirmed: true },
          b,
          "PUT",
        )
      ).status,
      404,
    );
    assert.equal(
      (await call("/campaigns", { ...campaign, groupIds: [group.id] })).status,
      409,
    );
    assert.equal(
      (
        await call(
          "/facebook/groups/" + group.id,
          { eligibility: "approved", confirmed: true },
          a,
          "PUT",
        )
      ).status,
      200,
    );
    Object.assign(env.state, { worker, a, b, task, group });
  });
}
