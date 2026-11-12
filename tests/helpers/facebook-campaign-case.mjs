import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
export function register(env) {
  const { call, campaign, accountKey } = env;
  test("empty drafts save but cannot run; selected groups are rechecked before prepare and submit", async () => {
    let { worker, a, b, task, group } = env.state;
    const draft = await call("/campaigns", campaign);
    assert.equal(draft.status, 200);
    assert.equal(
      (await call(`/campaigns/${draft.data.id}/run`, {})).status,
      409,
    );
    const saved = await call("/campaigns", {
      ...campaign,
      groupIds: [group.id],
    });
    assert.equal(saved.status, 200);
    const queued = await call(`/campaigns/${saved.data.id}/run`, {});
    assert.equal(queued.status, 200);
    const job = (await call("/device/claim", {})).data.job;
    assert.ok(job.id);
    const prepared = await call("/device/prepare", { jobId: job.id });
    assert.equal(prepared.data.campaign.facebookAccountKey, accountKey);
    assert.equal(prepared.data.campaign.autoJoin, false);
    assert.equal(
      (
        await call("/device/reserve", {
          jobId: job.id,
          attemptId: randomUUID(),
          groupUrl: "https://facebook.com/groups/other",
        })
      ).status,
      409,
    );
    await call(
      "/facebook/groups/" + group.id,
      { eligibility: "rejected" },
      a,
      "PUT",
    );
    assert.equal(
      (await call("/device/prepare", { jobId: job.id })).status,
      409,
    );
    assert.equal(
      (
        await call("/device/reserve", {
          jobId: job.id,
          attemptId: randomUUID(),
          groupUrl: group.url,
        })
      ).status,
      409,
    );
    await call(
      "/facebook/groups/" + group.id,
      { eligibility: "approved", confirmed: true },
      a,
      "PUT",
    );
    assert.equal(
      (await call("/device/prepare", { jobId: job.id })).status,
      409,
      "old snapshot cannot inherit a new approval",
    );
    assert.equal(
      (
        await call("/device/report", {
          jobId: job.id,
          finished: true,
          summary: { status: "no_targets", sent: 0 },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await worker.db
          .prepare("SELECT status FROM jobs WHERE id=?")
          .bind(job.id)
          .first()
      ).status,
      "no_targets",
    );
    Object.assign(env.state, { worker, a, b, task, group });
  });
}
