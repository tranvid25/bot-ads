import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
export function register(env) {
  const { call, campaign, accountKey } = env;
  test("changed group evidence clears approval; mixed account and stale reviews cannot schedule", async () => {
    let { worker, a, b, task, group } = env.state;
    await call(
      "/facebook/groups/" + group.id,
      { eligibility: "approved", confirmed: true },
      a,
      "PUT",
    );
    const discovery = await call("/facebook/discover", {
      keywords: ["website"],
    });
    await call("/device/discovery/claim", { accountKey });
    await call("/device/discovery/report", {
      taskId: discovery.data.id,
      groups: [{ ...group, membership: "not_joined" }],
      sequence: 1,
      finished: true,
    });
    let library = (await call("/facebook", undefined, a, "GET")).data;
    assert.equal(library.groups[0].eligibility, "unreviewed");
    assert.equal(library.groups[0].reviewed_at, null);
    await call(
      "/facebook/groups/" + group.id,
      { eligibility: "approved", confirmed: true },
      a,
      "PUT",
    );
    const second = await call("/facebook/discover", { keywords: ["website"] });
    await call("/device/discovery/claim", { accountKey: "b".repeat(64) });
    await call("/device/discovery/report", {
      taskId: second.data.id,
      groups: [{ ...group, url: "https://facebook.com/groups/second" }],
      sequence: 1,
      finished: true,
    });
    library = (await call("/facebook", undefined, a, "GET")).data;
    const other = library.groups.find((g) => g.id !== group.id);
    await call(
      "/facebook/groups/" + other.id,
      { eligibility: "approved", confirmed: true },
      a,
      "PUT",
    );
    assert.equal(
      (
        await call("/campaigns", {
          ...campaign,
          groupIds: [group.id, other.id],
        })
      ).status,
      409,
    );
    await worker.db
      .prepare("UPDATE facebook_groups SET reviewed_at=1 WHERE id=?")
      .bind(group.id)
      .run();
    assert.equal(
      (
        await call("/campaigns", {
          ...campaign,
          groupIds: [group.id],
          enabled: true,
        })
      ).status,
      409,
    );
    Object.assign(env.state, { worker, a, b, task, group });
  });
}
