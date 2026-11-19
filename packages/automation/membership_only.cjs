const { launchBrowser } = require("./browser_helper");
const { perform } = require("./membership_browser.cjs");
const { checkStop } = require("./runtime");

async function main({ group, operation, expectedUid }, dependencies = {}) {
  checkStop();
  const session = await (dependencies.launchBrowser || launchBrowser)({
    headless: false,
  });
  let retained = false;
  try {
    const result = await (dependencies.perform || perform)(session.page, {
      group,
      operation,
      expectedUid,
    });
    if (operation === "open" || result.status === "manual_required") {
      (dependencies.retain || require("./managed_session.cjs").retain)(session);
      retained = true;
      await session.page.bringToFront();
      if (operation === "open")
        result.note =
          "Đã mở nhóm trong phiên Facebook BotAds trên máy. Hoàn tất thao tác của bạn rồi bấm Kiểm tra trạng thái trên web.";
    }
    console.log(`${group.name}: ${result.note}`);
    return { groupId: group.id, ...result };
  } finally {
    if (!retained) {
      await session.context.close().catch(() => {});
      await session.browser.close().catch(() => {});
    }
  }
}
module.exports = { main };
