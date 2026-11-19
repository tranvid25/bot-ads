const path = require("path"),
  fs = require("fs"),
  crypto = require("crypto");
const root = path.resolve(__dirname, "../../packages/automation");
const { read, write, file } = require(path.join(root, "storage"));
const runtime = require(path.join(root, "runtime"));
const {
  mergeReservations,
  campaignConfig,
} = require("../../packages/desktop-state.cjs");
module.exports = async (message, { auth, rpc }) => {
  const { job, campaign, workspace, assets } = message;
  if (campaign.facebookAccountKey) {
    const uid = auth?.cookies?.find((c) => c.name === "c_user")?.value;
    const accountKey = crypto
      .createHash("sha256")
      .update("facebook:" + uid)
      .digest("hex");
    if (!uid || accountKey !== campaign.facebookAccountKey)
      throw new Error(
        "Tài khoản Facebook đang mở khác tài khoản đã duyệt nhóm. Hãy kết nối đúng tài khoản rồi chạy lại.",
      );
  }
  const { defaults } = require(path.join(root, "settings"));
  const previous = read("config.json", {});
  const state = mergeReservations(
    require(path.join(root, "history")).loadState(),
    read("reservations.json", []),
  );
  // Group relevance is campaign-specific even though the account history is shared.
  if (previous.cloudCampaignId !== job.campaignId)
    for (const group of Object.values(state.groups)) {
      if (group.approvalSource === "automatic") {
        group.advertisingAllowed = false;
        group.selection = null;
      }
    }
  write("automation_state.json", state);
  if (campaign.workflowVersion === 2) {
    for (const url of campaign.groupUrls)
      state.groups[url] = {
        ...state.groups[url],
        advertisingAllowed: true,
        approvalSource: "user",
        blocked: false,
      };
    write("automation_state.json", state);
  }
  const config = campaignConfig(
    campaign,
    workspace,
    job,
    assets,
    defaults,
    previous,
  );
  write("config.json", config);
  if (fs.existsSync(file("STOP"))) fs.unlinkSync(file("STOP"));
  runtime.setSubmissionGuard(async ({ groupUrl, postData, page }) => {
    const facebookUserId = auth?.cookies?.find(c => c.name === 'c_user')?.value;
    await require(path.join(root, 'account_guard.cjs')).assertFacebookIdentity(page, facebookUserId);
    const attemptId = crypto.randomUUID();
    // Persist before requesting a cloud reservation; interrupted requests must be reconciled.
    const reservation = {
      id: attemptId,
      groupUrl,
      status: "submitting",
      timestamp: new Date().toISOString(),
      title: postData.title,
      cloudJobId: job.id,
    };
    const local = read("reservations.json", []);
    local.push(reservation);
    write("reservations.json", local);
    const result = await rpc("reserve", {
      attemptId,
      groupUrl,
      title: postData.title,
    });
    return { ...result, facebookUserId };
  });
  return await runtime.runExclusive(() =>
    require(path.join(root, "automation")).main(),
  );
};
