import React from "react";
import { api } from "../../lib/api";
import { Badge, Empty, date } from "../ui";
import { useApp } from "./AppContext";
export default function ResultsPage() {
  const { data, events, setEvents, action } = useApp();
  return (
    <>
      <section className="panel">
        <h2>Các lượt chạy gần đây</h2>
        {!data.jobs.length ? (
          <Empty
            title="Chưa có lượt chạy"
            text="Lượt chạy sẽ xuất hiện sau khi bạn bật lịch hoặc bấm Chạy chiến dịch."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Chiến dịch</th>
                  <th>Thời điểm</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.jobs.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <strong>
                        {data.campaigns.find((c) => c.id === j.campaign_id)
                          ?.name || "Chiến dịch"}
                      </strong>
                      {j.result && JSON.parse(j.result).error && (
                        <small className="block danger">
                          {JSON.parse(j.result).error}
                        </small>
                      )}
                    </td>
                    <td>{date(j.created_at)}</td>
                    <td>
                      <Badge status={j.status} />
                      {!!j.cancel_requested && j.status === "running" && (
                        <small className="block">Đang yêu cầu dừng</small>
                      )}
                    </td>
                    <td>
                      <button
                        className="link"
                        onClick={() =>
                          action(async () =>
                            setEvents(
                              (await api(`/jobs/${j.id}/events`)).events,
                            ),
                          )
                        }
                      >
                        Nhật ký
                      </button>
                      {["running", "queued", "needs_review"].includes(
                        j.status,
                      ) && (
                        <button
                          className="link danger"
                          onClick={() =>
                            action(
                              () => api(`/jobs/${j.id}/cancel`, "POST", {}),
                              "Đã gửi yêu cầu dừng. Thao tác đã gửi lên Facebook không thể thu hồi bằng nút này.",
                            )
                          }
                        >
                          Dừng
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {events && (
        <section className="panel">
          <div className="section-title">
            <h2>Nhật ký lượt chạy</h2>
            <button className="link" onClick={() => setEvents(null)}>
              Đóng
            </button>
          </div>
          <pre className="logs">
            {events.length
              ? events.map((e) => `${date(e.created_at)}  ${e.text}`).join("\n")
              : "Chưa có nhật ký từ thiết bị."}
          </pre>
        </section>
      )}
      <section className="panel">
        <h2>Kết quả từng bài</h2>
        {!data.attempts.length ? (
          <p className="hint">
            Chưa có lượt gửi. Chỉ khi xác nhận được bài, hệ thống mới ghi “Đã
            xuất bản”.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bài / nhóm</th>
                  <th>Kết quả bài</th>
                  <th>Bình luận</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {data.attempts.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.title || "Bài viết"}</strong>
                      <a
                        className="block muted"
                        href={a.group_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {a.group_url.split("/").at(-1)}
                      </a>
                      {a.error && (
                        <small className="block danger">{a.error}</small>
                      )}
                    </td>
                    <td>
                      <Badge status={a.status} />
                    </td>
                    <td>
                      {a.comment ? <Badge status={a.comment.status} /> : "—"}
                    </td>
                    <td>
                      {a.postUrl ? (
                        <a
                          className="link"
                          href={a.postUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Mở bài ↗
                        </a>
                      ) : (
                        "Chưa xác định"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
