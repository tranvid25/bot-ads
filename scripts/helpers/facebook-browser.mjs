import { readFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { validateCampaign } from "../../packages/contracts/campaign.mjs";
export async function setupFacebookBrowser(page) {
  // Isolated browser fixtures: never posts, pairs or searches on production.
  const base = "https://botads.test",
    dist = path.resolve("apps/web/dist");
  const dashboard = {
    user: { id: "fixture", name: "Device Owner", email: "fixture@example.com" },
    settings: { dailyLimit: 30, timezone: "Asia/Ho_Chi_Minh" },
    campaigns: [],
    devices: [],
    jobs: [],
    assets: [],
    attempts: [],
  };
  const library = { groups: [], tasks: [] };
  const marketing = { brands: [], channels: [], posts: [], publications: [], attempts: [], capabilities: { encryption: true, manual: true, cadenceMinutes: 5 } };
  const social = { device: null, tasks: [] };
  let pairingCalls = 0,
    savedCampaign;

  page.setDefaultTimeout(12000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (dialog) => dialog.accept());
  await page.route(`${base}/**`, async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.pathname.startsWith("/api/")) {
      let data;
      if (url.pathname === "/api/meta")
        data = {
          name: "BotAds",
          registrationOpen: true,
          maxDaily: 100,
          downloadAvailable: true,
        };
      else if (url.pathname === "/api/dashboard") data = dashboard;
      else if (url.pathname === "/api/marketing") data = marketing;
      else if (url.pathname === "/api/marketing/desktop/status") data = social;
      else if (url.pathname === "/api/marketing/desktop/start") {
        const input = request.postDataJSON();
        assert.ok(["threads", "instagram"].includes(input.provider));
        assert.equal(input.brandId, marketing.brands[0].id);
        social.tasks.unshift({ id: input.provider, provider: input.provider, kind: "connect", status: "queued" });
        data = { id: input.provider, status: "queued" };
      }
      else if (url.pathname === "/api/auth/google/account")
        data = { account: null, available: false, canUnlink: true };
      else if (url.pathname === "/api/pairings") {
        pairingCalls++;
        data = { code: "abcd-1234-ef56-7890", expiresIn: 600 };
      } else if (url.pathname === "/api/facebook") data = library;
      else if (
        url.pathname === "/api/facebook/groups" &&
        request.method() === "POST"
      ) {
        library.groups.push({
          id: "group",
          name: "Website owners",
          url: request.postDataJSON().url,
          membership: "unknown",
          eligibility: "unreviewed",
          source: "import",
          reason: "Kiểm tra nội quy trước khi duyệt.",
        });
        data = { ok: true };
      } else if (
        url.pathname === "/api/facebook/groups/group" &&
        request.method() === "PUT"
      ) {
        Object.assign(library.groups[0], request.postDataJSON(), {
          reviewed_at: Date.now(),
        });
        data = { ok: true };
      } else if (url.pathname === "/api/facebook/discover") {
        library.tasks.push({
          id: "task",
          status: "queued",
          config: request.postDataJSON(),
          groups_seen: 0,
        });
        data = { id: "task" };
      } else if (
        url.pathname === "/api/campaigns" &&
        request.method() === "POST"
      ) {
        savedCampaign = validateCampaign(request.postDataJSON(), 100);
        dashboard.campaigns = [{ ...savedCampaign, id: "fixture-campaign" }];
        data = { id: "fixture-campaign" };
      } else
        throw new Error(
          `Unexpected API fixture: ${request.method()} ${url.pathname}`,
        );
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    }
    const file = path.resolve(
      dist,
      url.pathname === "/" ? "index.html" : `.${url.pathname}`,
    );
    assert.ok(file.startsWith(dist + path.sep));
    return route.fulfill({
      status: 200,
      contentType: file.endsWith(".js")
        ? "text/javascript"
        : file.endsWith(".css")
          ? "text/css"
          : file.endsWith(".png")
            ? "image/png"
            : "text/html",
      body: await readFile(file),
    });
  });

  return {
    marketing,
    social,
    base,
    dashboard,
    errors,
    pairingCalls: () => pairingCalls,
    savedCampaign: () => savedCampaign,
  };
}
