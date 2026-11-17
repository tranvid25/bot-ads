export function scheduleFields(input, now = Date.now()) {
  const scheduleType = input.scheduleType || "weekly";
  if (!["once", "weekly"].includes(scheduleType))
    throw Object.assign(new Error("Loại lịch không hợp lệ."), { status: 400 });
  if (scheduleType === "weekly") return { scheduleType };
  const scheduledAt = Date.parse(input.scheduledAt);
  if (!Number.isFinite(scheduledAt) || (input.enabled && scheduledAt <= now))
    throw Object.assign(
      new Error("Chọn ngày giờ trong tương lai cho lịch một lần."),
      { status: 400 },
    );
  return { scheduleType, scheduledAt: new Date(scheduledAt).toISOString() };
}
export function onceDue(campaign, now) {
  const time = Date.parse(campaign.scheduledAt);
  const delta = now.getTime() - time;
  return Number.isFinite(time) && delta >= 0 && delta < 7200000
    ? `once:${time}`
    : null;
}
