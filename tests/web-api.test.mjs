import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../apps/web/src/lib/api.js", import.meta.url),
  "utf8",
);
const { readApiResponse } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const proxySource = await readFile(
  new URL("../apps/web/functions/api/[[path]].js", import.meta.url),
  "utf8",
);
const { onRequest } = await import(
  `data:text/javascript;base64,${Buffer.from(proxySource).toString("base64")}`
);

test("API reader reports empty, HTML and malformed JSON responses as actionable errors", async () => {
  for (const text of ["", "<html>Cloudflare error</html>", '{"broken":']) {
    await assert.rejects(
      readApiResponse(new Response(text, { status: 502 })),
      (e) =>
        e.status === 502 &&
        /HTTP 502/.test(e.message) &&
        !(e instanceof SyntaxError) &&
        !e.message.includes("<html>"),
    );
  }
  await assert.rejects(
    readApiResponse(new Response("", { status: 200 })),
    /phản hồi rỗng/,
  );
});
test("API reader preserves valid JSON errors and success responses", async () => {
  assert.deepEqual(await readApiResponse(Response.json({ ok: true })), {
    ok: true,
  });
  await assert.rejects(
    readApiResponse(Response.json({ error: "Cần đăng nhập" }, { status: 401 })),
    (e) => e.status === 401 && e.message === "Cần đăng nhập",
  );
});
test("Pages proxy preserves OAuth redirects and cookies and returns JSON on binding failures", async () => {
  const response = await onRequest({
    request: new Request(
      "https://bot.salesora.space/api/marketing/linkedin/callback",
    ),
    env: {
      BACKEND: {
        fetch(request) {
          assert.equal(request.redirect, "manual");
          return new Response(null, {
            status: 303,
            headers: {
              Location: "https://bot.salesora.space/?linkedin=connected",
              "Set-Cookie": "botads_oauth=; Max-Age=0",
            },
          });
        },
      },
    },
  });
  assert.equal(response.status, 303);
  assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
  const failed = await onRequest({
    request: new Request("https://bot.salesora.space/api/meta"),
    env: {
      BACKEND: {
        fetch() {
          throw new Error("internal secret");
        },
      },
    },
  });
  assert.equal(failed.status, 502);
  assert.match((await failed.json()).error, /Worker API/);
});
