import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCampaign, isDue } from "../packages/contracts/campaign.mjs";
const valid = {
  name: "Tiếng Anh",
  mode: "manual",
  keywords: ["english"],
  posts: [{ id: "p1", content: "Bài của tôi", selected: true }],
  dailyLimit: 50,
};
test("manual campaign preserves exact content and selected posts", () => {
  const c = validateCampaign({
    ...valid,
    posts: [
      { content: "Tự soạn\nhttps://pronunreview.com", selected: true },
      { content: "Không chọn", selected: false },
    ],
  });
  assert.equal(c.posts[0].content, "Tự soạn\nhttps://pronunreview.com");
  assert.equal(c.posts[1].selected, false);
  assert.equal(c.dailyLimit, 50);
  assert.equal(c.autoGenerate, false);
});
test("rejects out of range limits, empty content and invalid groups", () => {
  for (const dailyLimit of [0, 101, 1.5])
    assert.throws(() => validateCampaign({ ...valid, dailyLimit }));
  assert.throws(() => validateCampaign({ ...valid, posts: [] }));
  assert.throws(() =>
    validateCampaign({
      ...valid,
      groupUrls: ["https://evil.example/groups/1"],
    }),
  );
});
test("automatic Gemini generation requires a prompt, not preexisting posts", () => {
  const c = validateCampaign({
    ...valid,
    mode: "gemini",
    autoGenerate: true,
    prompt: "Viết bài giới thiệu",
    posts: [],
  });
  assert.equal(c.autoGenerate, true);
  assert.throws(() =>
    validateCampaign({
      ...valid,
      mode: "gemini",
      autoGenerate: true,
      prompt: "",
    }),
  );
});
test("Vietnam schedule catches up within two hours and never overnight", () => {
  const c = validateCampaign({
    ...valid,
    time: "09:00",
    weekdays: [1, 2, 3, 4, 5, 6, 0],
  });
  assert.equal(isDue(c, new Date("2026-10-17T02:00:00Z")), "2026-10-17");
  assert.equal(isDue(c, new Date("2026-10-17T03:59:00Z")), "2026-10-17");
  assert.equal(isDue(c, new Date("2026-10-17T04:00:00Z")), null);
  assert.equal(isDue(c, new Date("2026-10-17T01:59:00Z")), null);
});
