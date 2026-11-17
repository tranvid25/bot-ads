import { test } from "node:test";
import assert from "node:assert/strict";
import { facebookAttention } from "../packages/contracts/facebook-attention.mjs";
test("attention distinguishes offline work, uncertain sends and pending cancellation", () => {
  const alerts = facebookAttention({
    jobs: [{ id: "a", status: "running", cancel_requested: 1 }],
    devices: [],
    attempts: [{ id: "p", status: "unknown" }],
  });
  assert.deepEqual(
    alerts.map((item) => item.id),
    ["offline", "cancel:a", "attempt:p"],
  );
});
test("idle workspaces and confirmed outcomes do not produce warnings", () => {
  assert.deepEqual(
    facebookAttention({
      jobs: [{ status: "completed" }],
      attempts: [{ status: "success" }],
    }),
    [],
  );
  assert.deepEqual(
    facebookAttention(
      { jobs: [{ status: "queued" }], devices: [{ last_seen: 950 }] },
      1000,
    ),
    [],
  );
});
