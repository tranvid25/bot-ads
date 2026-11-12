import { Miniflare } from "miniflare";
import { readFile } from "node:fs/promises";
import { testWorker } from "../../scripts/test-worker.mjs";

export async function facebookWorker() {
  const mf = new Miniflare({
    ...(await testWorker()),
    compatibilityDate: "2025-09-01",
    d1Databases: ["DB"],
    r2Buckets: ["MEDIA"],
    bindings: {
      AUTH_SECRET: "test-secret-at-least-32-characters-long",
      ALLOW_REGISTRATION: "true",
      MAX_DAILY_POSTS: "100",
    },
  });
  const db = await mf.getD1Database("DB");
  for (const migration of ["0001_init.sql", "0002_marketing.sql", "0008_facebook_groups.sql", "0009_desktop_social.sql"]) {
    const sql = await readFile("apps/api/migrations/" + migration, "utf8");
    await db.batch(
      sql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => db.prepare(s)),
    );
  }
  async function request(path, { method = "GET", data, cookie, token } = {}) {
    const response = await mf.dispatchFetch("http://localhost/api" + path, {
      method,
      headers: {
        Origin: "http://localhost",
        ...(cookie ? { Cookie: cookie } : {}),
        ...(token ? { Authorization: "Bearer " + token } : {}),
        "Content-Type": "application/json",
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  }
  async function owner(name) {
    const registered = await request("/auth/register", {
      method: "POST",
      data: {
        name,
        email: name + "@example.com",
        password: "correct horse battery staple",
      },
    });
    const cookie = registered.cookie;
    const pairing = await request("/pairings", {
      method: "POST",
      cookie,
      data: {},
    });
    const device = await request("/device/pair", {
      method: "POST",
      data: { code: pairing.data.code, name },
    });
    const token = device.data.token;
    await request("/device/heartbeat", {
      method: "POST",
      token,
      data: { facebookReady: true, discoverySupported: true },
    });
    return { cookie, token, ...device.data };
  }
  return { mf, db, request, owner };
}
