import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { facebookWorker } from "./helpers/facebook-worker.mjs";
test("library saves exact content, deduplicates a source and isolates customers", async () => {
  const w = await facebookWorker();
  try {
    const sql = await readFile(
      "apps/api/migrations/0010_facebook_templates.sql",
      "utf8",
    );
    await w.db.batch(
      sql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => w.db.prepare(s)),
    );
    const a = await w.owner("library-a"),
      b = await w.owner("library-b");
    const data = {
      sourceId: "post-fixture",
      title: "Website service",
      content: "First line\nSecond line",
      assetId: "",
    };
    const call = (path, method = "GET", input, owner = a) =>
      w.request(`/facebook/templates${path}`, {
        method,
        data: input,
        cookie: owner.cookie,
      });
    const first = await call("", "POST", data);
    assert.equal(first.status, 200, JSON.stringify(first.data));
    assert.equal((await call("", "POST", data)).data.id, first.data.id);
    let list = await call("");
    assert.equal(list.data.templates.length, 1);
    assert.equal(list.data.templates[0].content, data.content);
    assert.equal(
      (await call("", "GET", undefined, b)).data.templates.length,
      0,
    );
    assert.equal(
      (await call(`/${first.data.id}`, "DELETE", undefined, b)).status,
      404,
    );
    assert.equal(
      (await call("", "POST", { ...data, assetId: "foreign-asset" })).status,
      400,
    );
    assert.equal((await call(`/${first.data.id}`, "DELETE")).status, 200);
    assert.equal((await call("")).data.templates.length, 0);
  } finally {
    await w.mf.dispose();
  }
});
