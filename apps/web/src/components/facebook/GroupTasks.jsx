import React from "react";
const membershipStates = {
  joined: "Đã tham gia",
  requested: "Chờ quản trị viên",
  not_joined: "Chưa tham gia",
  manual_required: "Cần bạn hoàn tất",
  unknown: "Cần kiểm tra lại",
  checking: "Chưa xác nhận",
};
const states = {
  queued: "Chờ máy nhận việc",
  running: "Đang xử lý",
  completed: "Đã hoàn tất",
  failed: "Cần kiểm tra",
  canceled: "Đã hủy",
};
export default function GroupTasks({ tasks, busy, act }) {
  if (!tasks.length) return null;
  return (
    <section className="panel mk-form">
      <h2>Tiến độ tìm và tham gia nhóm</h2>
      {tasks.map((task) => {
        const membership = task.kind === "membership";
        const results = task.results || [];
        const operation = {
          join: "Xin tham gia",
          check: "Kiểm tra trạng thái",
          open: "Mở trên máy BotAds",
        }[task.config.operation];
        return (
          <article key={task.id} className="fb-task">
            <strong>
              <span>{membership ? operation : "Tìm nhóm"}</span> · <span>{states[task.status]}</span>
            </strong>
            <p>
              {membership
                ? `${task.groups_seen}/${task.config.limit} nhóm đã kiểm tra`
                : `${task.config.keywords.join(", ")} · ${task.groups_seen} kết quả`}
            </p>
            {task.status === "queued" && (
              <p>
                Mở BotAds đã kết nối Facebook và giữ máy có mạng. Tham gia nhóm
                cần app từ bản 1.1.14; không cần ngắt rồi ghép lại.
              </p>
            )}
            {task.error && <p className="danger">{task.error}</p>}
            {!!results.length && (
              <>
                <p>
                  {Object.entries(membershipStates)
                    .map(([key, label]) => {
                      const count = results.filter(
                        (r) => r.status === key,
                      ).length;
                      return count ? `${label}: ${count}` : "";
                    })
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <details>
                  <summary>Chi tiết từng nhóm</summary>
                  {results.map((result) => {
                    const group = task.config.groups.find(
                      (g) => g.id === result.group_id,
                    );
                    return (
                      <div key={result.group_id} className="fb-task-result">
                        <a href={group?.url} target="_blank" rel="noreferrer">
                          {group?.name || result.group_id}
                        </a>
                        <strong>{membershipStates[result.status]}</strong>
                        <small>{result.note}</small>
                      </div>
                    );
                  })}
                </details>
              </>
            )}
            {["queued", "running"].includes(task.status) && (
              <button
                className="link"
                disabled={busy}
                onClick={() => act(`tasks/${task.id}`, "POST", {})}
              >
                Hủy lượt xử lý nhóm
              </button>
            )}
          </article>
        );
      })}
    </section>
  );
}
