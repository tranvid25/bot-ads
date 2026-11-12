import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
const labels = {
  queued: "Chờ máy mở trình duyệt",
  running: "Hãy đăng nhập trong cửa sổ BotAds",
  completed: "Đã xác minh tài khoản",
  failed: "Kết nối chưa thành công",
  needs_reauth: "Cần đăng nhập lại",
  canceled: "Đã dừng",
};
export default function DesktopConnectionProgress() {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const load = () =>
      api("/marketing/desktop/status")
        .then((value) => {
          if (alive) {
            setData(value);
            setError("");
          }
        })
        .catch((e) => {
          if (alive) setError(e.message);
        });
    load();
    const timer = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  if (!error && !data?.tasks?.length) return null;
  return (
    <section className="panel mk-form" aria-label="Kết nối kênh qua máy tính">
      <h3>Kết nối Threads / Instagram qua máy tính</h3>
      {error && <p role="alert">{error}</p>}
      {data?.device && (
        <p>
          {data.device.name}:{" "}
          {Date.now() - data.device.last_seen < 120000
            ? "đang online"
            : "đang offline"}
          . Giữ app mở để đăng nhập và nhận lịch.
        </p>
      )}
      {data?.tasks?.slice(0, 3).map((task) => (
        <div key={task.id}>
          <strong>
            {task.provider} · {labels[task.status] || task.status}
          </strong>
          {task.error && <p className="danger">{task.error}</p>}
          {["queued", "running"].includes(task.status) && (
            <button
              type="button"
              className="link danger"
              onClick={() =>
                api(`/marketing/desktop/tasks/${task.id}/cancel`, "POST", {})
                  .then(() =>
                    setData((current) => ({
                      ...current,
                      tasks: current.tasks.map((t) =>
                        t.id === task.id ? { ...t, status: "canceled" } : t,
                      ),
                    })),
                  )
                  .catch((e) => setError(e.message))
              }
            >
              Hủy kết nối
            </button>
          )}
        </div>
      ))}
    </section>
  );
}
