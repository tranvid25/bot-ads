import { facebookWorker } from "./facebook-worker.mjs";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
export async function socialWorker() {
  const worker = await facebookWorker();
  const a = await worker.owner("social-a"),
    b = await worker.owner("social-b");
  const call = (path, data, owner = a, method = "POST") =>
    worker.request(path, {
      method,
      data,
      ...(path.startsWith("/device/")
        ? { token: owner.token }
        : { cookie: owner.cookie }),
    });
  await call("/device/heartbeat", {
    socialSupported: true,
    facebookReady: true,
    discoverySupported: true,
  });
  const brandId = randomUUID();
  await worker.db
    .prepare(
      "INSERT INTO marketing_brands(id,workspace_id,name,website,created_at) VALUES (?,?,?,'https://xaywebsite.com',?)",
    )
    .bind(brandId, a.workspaceId, "Website", Date.now())
    .run();
  async function connect(provider) {
    const response = await call("/marketing/desktop/start", {
      provider,
      brandId,
    });
    assert.equal(response.status, 200, JSON.stringify(response.data));
    const claimed = await call("/device/social/claim", {});
    assert.equal(claimed.data.task.kind, "connect");
    const task = claimed.data.task;
    assert.equal(
      (
        await call("/device/social/report", {
          taskId: task.id,
          claimToken: task.claimToken,
          status: "connected",
          identity: { actorId: provider + "fixture" },
        })
      ).status,
      200,
    );
    return worker.db
      .prepare("SELECT * FROM marketing_channels WHERE provider=?")
      .bind(provider)
      .first();
  }
  async function post(channel, assetId = "") {
    const draft = await call("/marketing/posts", {
      brandId,
      title: "Website " + randomUUID(),
      variants: [
        {
          provider: channel.provider,
          content: "Website service https://xaywebsite.com",
          tags: [],
          assetId,
        },
      ],
    });
    assert.equal(draft.status, 200, JSON.stringify(draft.data));
    const row = await worker.db
      .prepare("SELECT * FROM marketing_posts WHERE id=?")
      .bind(draft.data.id)
      .first();
    assert.equal(
      (
        await call(`/marketing/posts/${row.id}/approve`, {
          revision: row.revision,
        })
      ).status,
      200,
    );
    const response = await call(`/marketing/posts/${row.id}/schedule`, {
      revision: row.revision,
      channelIds: [channel.id],
      scheduledAt: new Date(Date.now() - 1000).toISOString(),
    });
    return response;
  }
  async function claim() {
    await worker.db
      .prepare("UPDATE marketing_account_slots SET until_at=0")
      .run();
    const response = await call("/device/social/claim", {});
    assert.equal(response.status, 200, JSON.stringify(response.data));
    return response.data.task;
  }
  const taskData = (task) => ({ taskId: task.id, claimToken: task.claimToken });
  return { ...worker, a, b, call, brandId, connect, post, claim, taskData };
}
