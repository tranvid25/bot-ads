const { sleep, checkStop, assertAccountReady } = require("./runtime");
const { assertFacebookIdentity } = require("./account_guard.cjs");
const names = {
  joined: /^(Joined(?: group)?|Đã tham gia(?: nhóm)?)$/i,
  requested:
    /^(Cancel (?:join )?request(?: to join)?|Hủy yêu cầu|Huỷ yêu cầu|Requested|Đã gửi yêu cầu)$/i,
  not_joined: /^(Join group|Tham gia nhóm)$/i,
};
const notes = {
  joined:
    "Đã tham gia nhóm. Kiểm tra nội quy và duyệt nhóm trước khi đưa vào chiến dịch.",
  requested: "Đã gửi yêu cầu; đang chờ quản trị viên duyệt thành viên.",
  not_joined:
    "Chưa tham gia. Nếu nhóm cho phép tạo bài, vẫn có thể duyệt để đăng.",
  manual_required:
    "Có câu hỏi hoặc điều kiện tham gia. Hoàn tất trong tab Facebook BotAds đã mở, rồi bấm Kiểm tra trạng thái.",
  unknown:
    "Chưa xác định được kết quả. Kiểm tra trạng thái hoặc mở nhóm; không tự gửi lại yêu cầu.",
};
async function observe(page) {
  for (const status of ["joined", "requested"])
    if (
      await page
        .getByRole("button", { name: names[status] })
        .first()
        .isVisible()
    )
      return status;
  const questions = page
    .getByRole("dialog")
    .filter({
      hasText:
        /membership questions|group questions|answer.*questions|group rules|join group|request to join|câu hỏi|tham gia nhóm|quy tắc nhóm/i,
    });
  if (await questions.first().isVisible()) return "manual_required";
  if (
    await page
      .getByRole("button", { name: names.not_joined })
      .first()
      .isVisible()
  )
    return "not_joined";
  return "unknown";
}
async function perform(
  page,
  { group, operation, expectedUid },
  dependencies = {},
) {
  const wait = dependencies.sleep || sleep;
  const guard = async () => {
    checkStop();
    await assertAccountReady(page);
    await assertFacebookIdentity(page, expectedUid);
  };
  await page.goto(group.url, { waitUntil: "domcontentloaded", timeout: 45000 });
  let status;
  for (let i = 0; i < 30; i++) {
    await guard();
    status = await observe(page);
    if (status !== "unknown") break;
    await wait(500);
  }
  if (operation !== "join" || status !== "not_joined" || !group.allowJoin)
    return { status, note: notes[status] };
  await guard();
  if (
    (await page.getByRole("button", { name: names.not_joined }).count()) !== 1
  )
    return {
      status: "unknown",
      note: "Có nhiều nút tham gia; mở đúng nhóm trên máy BotAds để kiểm tra, chưa gửi yêu cầu.",
    };
  // One click only. An ambiguous response must be checked, never blindly retried.
  try {
    await page
      .getByRole("button", { name: names.not_joined })
      .first()
      .click({ timeout: 10000 });
    status = "unknown";
    for (let i = 0; i < 16; i++) {
      await wait(500);
      await guard();
      const next = await observe(page);
      if (["joined", "requested", "manual_required"].includes(next)) {
        status = next;
        break;
      }
    }
  } catch (e) {
    if (e.name === "HaltError") throw e;
    return {
      status: "unknown",
      note: `${notes.unknown} ${e.message.slice(0, 200)}`,
    };
  }
  return { status, note: notes[status] };
}
module.exports = { perform, observe, notes };
