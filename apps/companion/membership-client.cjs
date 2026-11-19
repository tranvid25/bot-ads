module.exports = async function runMembership(
  task,
  { request, spawnRunner, persist, stopped, log },
) {
  let active = {
    taskId: task.id,
    kind: "membership",
    sequence: 0,
    finished: false,
  };
  const send = async (membership) => {
    active = { ...active, sequence: active.sequence + 1, membership };
    persist(active);
    await request("/discovery/report", "POST", active);
  };
  persist(active);
  try {
    for (let index = 0; index < task.config.groups.length; index++) {
      if (stopped())
        throw new Error(
          "Đã tạm dừng nhận việc. Kết quả đã xử lý được giữ lại.",
        );
      const group = task.config.groups[index];
      log(`${index + 1}/${task.config.groups.length} · ${group.name}`);
      // Record intent durably before a possible Join click; a crash must not permit an automatic repeat.
      await send({
        groupId: group.id,
        status: "checking",
        note: "Máy đang kiểm tra hoặc gửi yêu cầu tham gia.",
      });
      const result = await spawnRunner({
        action: "membership",
        group,
        operation: task.config.operation,
        job: { id: task.id },
        leaseUntil: Date.now() + 45000,
      });
      if (result.membership) await send(result.membership);
      else
        await send({
          groupId: group.id,
          status: "unknown",
          note:
            result.error ||
            "Chưa có kết quả từ máy. Kiểm tra lại trạng thái trước khi gửi yêu cầu mới.",
        });
      if (result.error) {
        if (result.halted || result.authInvalid) throw new Error(result.error);
        log(
          `Chưa xác nhận nhóm này: ${result.error}. Tiếp tục nhóm tiếp theo.`,
        );
      }
      if (
        task.config.operation === "join" &&
        index + 1 < task.config.groups.length
      ) {
        log("Chờ 30 giây trước nhóm tiếp theo.");
        for (let n = 0; n < 60 && !stopped(); n++)
          await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  } catch (e) {
    active.error = e.message;
    log(e.message);
  }
  if (active.error && active.membership?.status === "checking")
    active.membership = {
      ...active.membership,
      status: "unknown",
      note: active.error + " Kiểm tra trạng thái trước khi xin tham gia lại.",
    };
  active = { ...active, sequence: active.sequence + 1, finished: true };
  persist(active);
};
