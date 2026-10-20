const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  mergeReservations,
  campaignConfig,
} = require("../packages/desktop-state.cjs");
test("crash recovery retains accepted cloud reservations without duplicating known outcomes", () => {
  const state = { attempts: [{ id: "sent", status: "success" }] };
  const pending = [
    { id: "sent", status: "submitting" },
    { id: "lost", status: "submitting" },
    { id: "denied", status: "failed" },
  ];
  const merged = mergeReservations(state, pending);
  assert.equal(merged.attempts.length, 3);
  assert.equal(merged.attempts[0].status, "success");
  assert.equal(merged.attempts[1].status, "unknown");
  assert.equal(merged.attempts[2].status, "failed");
  assert.equal(mergeReservations(merged, pending).attempts.length, 3);
});
test("desktop config only carries selected content and preserves per-account daily cap", () => {
  const campaign = {
    groupUrls: [],
    posts: [
      { selected: true, content: "Đúng bài", assetId: "a" },
      { selected: false, content: "Không đăng" },
    ],
    dailyLimit: 50,
    keywords: ["english"],
    excludedKeywords: [],
    cooldownDays: 7,
    commentUrl: "https://example.com",
    commentText: "Link của tôi",
    commentEnabled: true,
    autoDiscover: true,
    autoJoin: false,
  };
  const config = campaignConfig(
    campaign,
    { daily_limit: 30, timezone: "Asia/Ho_Chi_Minh" },
    { id: "job", campaignId: "campaign" },
    { a: "C:/private/picture.png" },
    {},
    {},
  );
  assert.equal(config.selectedPosts.length, 1);
  assert.equal(config.selectedPosts[0].imagePath, "C:/private/picture.png");
  assert.equal(config.maxPostsPerDay, 30);
  assert.equal(config.automation.generateAI, false);
  assert.equal(config.commentWebsiteUrl, "https://example.com");
});
