import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { facebookWorker } from "./helpers/facebook-worker.mjs";
test("CSV import validates every URL before inserting and deduplicates retries", async () => {
  const w = await facebookWorker();
  try {
    const a = await w.owner("csv-pilot");
    const csv = "url,name\nhttps://www.facebook.com/groups/123456,Website";
    const first = await w.request("/facebook/groups/import", {
      method: "POST",
      cookie: a.cookie,
      data: { csv },
    });
    assert.equal(first.status, 200, JSON.stringify(first.data));
    assert.equal(first.data.added, 1);
    const second = await w.request("/facebook/groups/import", {
      method: "POST",
      cookie: a.cookie,
      data: { csv },
    });
    assert.equal(second.data.duplicate, 1);
    assert.equal(
      (
        await w.request("/facebook/groups/import", {
          method: "POST",
          cookie: a.cookie,
          data: {
            csv: "https://www.facebook.com/groups/7777,Valid\nhttps://evil.example/123,Invalid",
          },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await w.db
          .prepare(
            "SELECT count(*) AS n FROM facebook_groups WHERE workspace_id=?",
          )
          .bind(a.workspaceId)
          .first()
      ).n,
      1,
    );
  } finally {
    await w.mf.dispose();
  }
});
test("retrying a create/save-and-run request produces one campaign and one job", async () => {
  const w = await facebookWorker();
  try {
    const a = await w.owner("retry-campaign");
    const data = {
      requestId: randomUUID(),
      publishMode: "now",
      name: "Retry pilot",
      mode: "manual",
      keywords: ["website"],
      dailyLimit: 3,
      posts: [
        { id: "p", title: "Original", content: "Original", selected: true },
      ],
    };
    const first = await w.request("/campaigns", {
      method: "POST",
      cookie: a.cookie,
      data,
    });
    assert.equal(first.status, 200, JSON.stringify(first.data));
    const second = await w.request("/campaigns", {
      method: "POST",
      cookie: a.cookie,
      data,
    });
    assert.equal(second.status, 200, JSON.stringify(second.data));
    assert.equal(first.data.id, second.data.id);
    assert.equal(first.data.job.id, second.data.job.id);
    assert.equal(
      (
        await w.request("/campaigns", {
          method: "POST",
          cookie: a.cookie,
          data: { ...data, name: "Changed payload" },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await w.db
          .prepare("SELECT count(*) AS n FROM jobs WHERE workspace_id=?")
          .bind(a.workspaceId)
          .first()
      ).n,
      1,
    );
  } finally {
    await w.mf.dispose();
  }
});
test("delete stops queued/running work, retains history, rejects edits and isolates owners", async () => {
  const w = await facebookWorker();
  try {
    const a = await w.owner("delete-a"),
      b = await w.owner("delete-b");
    const created = await w.request("/campaigns", {
      method: "POST",
      cookie: a.cookie,
      data: {
        name: "Delete pilot",
        mode: "manual",
        keywords: ["website"],
        posts: [
          { id: "p", title: "Test", content: "Original", selected: true },
        ],
        dailyLimit: 3,
        enabled: false,
      },
    });
    assert.equal(created.status, 200, JSON.stringify(created.data));
    const id = created.data.id;
    for (const status of ["queued", "running"])
      await w.db
        .prepare(
          "INSERT INTO jobs(id,workspace_id,campaign_id,slot,snapshot,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
        )
        .bind(
          randomUUID(),
          a.workspaceId,
          id,
          randomUUID(),
          "{}",
          status,
          Date.now(),
          Date.now(),
        )
        .run();
    assert.equal(
      (
        await w.request(`/campaigns/${id}`, {
          method: "DELETE",
          cookie: b.cookie,
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await w.request(`/campaigns/${id}`, {
          method: "DELETE",
          cookie: a.cookie,
        })
      ).status,
      200,
    );
    const jobs = (
      await w.db
        .prepare("SELECT status,cancel_requested FROM jobs WHERE campaign_id=?")
        .bind(id)
        .all()
    ).results;
    assert.ok(jobs.every((job) => job.cancel_requested === 1));
    assert.ok(jobs.some((job) => job.status === "canceled"));
    assert.equal(
      (
        await w.request(`/campaigns/${id}/run`, {
          method: "POST",
          cookie: a.cookie,
          data: {},
        })
      ).status,
      404,
    );
    assert.equal(
      (await w.request("/dashboard", { cookie: a.cookie })).data.campaigns
        .length,
      0,
    );
    assert.equal(
      (
        await w.request(`/campaigns/${id}`, {
          method: "DELETE",
          cookie: a.cookie,
        })
      ).status,
      200,
    );
  } finally {
    await w.mf.dispose();
  }
});
test("bulk review isolates customers and keeps prohibited groups out of quick approval", async () => {
  const w = await facebookWorker();
  try {
    const a = await w.owner("bulk-a"),
      b = await w.owner("bulk-b");
    const ids = [randomUUID(), randomUUID()];
    for (let i = 0; i < ids.length; i++)
      await w.db
        .prepare(
          "INSERT INTO facebook_groups(id,workspace_id,account_key,url,name,source,reason,checked_at,created_at) VALUES (?,?,'import',?,'Fixture','import',?,?,?)",
        )
        .bind(
          ids[i],
          a.workspaceId,
          `https://www.facebook.com/groups/${i + 12345}`,
          i ? "Nội quy cấm quảng cáo" : "Cần kiểm tra",
          Date.now(),
          Date.now(),
        )
        .run();
    const data = { ids, confirmed: true };
    assert.equal(
      (
        await w.request("/facebook/groups/review", {
          method: "POST",
          cookie: b.cookie,
          data,
        })
      ).status,
      404,
    );
    const result = await w.request("/facebook/groups/review", {
      method: "POST",
      cookie: a.cookie,
      data,
    });
    assert.equal(result.status, 200);
    assert.deepEqual(result.data, { approved: 1, skipped: 1 });
  } finally {
    await w.mf.dispose();
  }
});
