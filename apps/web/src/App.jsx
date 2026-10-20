import React, { useState, useEffect } from "react";
import { api } from "./lib/api";
import { Icon, Brand, Badge, Empty, date } from "./components/ui";
import Auth from "./pages/Auth";
import Editor from "./components/CampaignEditor";
export default function App() {
  const [meta, setMeta] = useState({ maxDaily: 100, registrationOpen: true }),
    [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState("overview"),
    [editor, setEditor] = useState(null),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [pair, setPair] = useState(""),
    [events, setEvents] = useState(null),
    [busy, setBusy] = useState(false),
    [limit, setLimit] = useState(30);
  const refresh = async () => {
    try {
      const d = await api("/dashboard");
      setData(d);
      setLimit(d.settings.dailyLimit);
      return d;
    } catch (e) {
      if (e.status === 401) setData(null);
      else setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    api("/meta")
      .then(setMeta)
      .catch((e) => setError(e.message));
    refresh();
  }, []);
  useEffect(() => {
    if (!data) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 15000);
    return () => clearInterval(timer);
  }, [!!data]);
  async function action(work, message) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      await refresh();
      if (message) setNotice(message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file) {
    if (file.size > 5 * 1024 * 1024) throw new Error("Ảnh tối đa 5 MB.");
    const r = await fetch("/api/assets", {
      method: "POST",
      headers: {
        "Content-Type": file.type,
        "X-File-Name": encodeURIComponent(file.name),
      },
      body: file,
    });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error);
    await refresh();
    return result;
  }
  if (loading)
    return (
      <div className="loading">
        <Brand />
        <p>Đang mở không gian của bạn…</p>
      </div>
    );
  if (!data) return <Auth onLogin={refresh} meta={meta} />;
  const device = data.devices[0],
    online = device && Date.now() - device.last_seen < 120000;
  const selectedCampaign = data.campaigns.find((c) => c.id === editor);
  const nav = [
    ["overview", "grid", "Tổng quan"],
    ["campaigns", "campaign", "Chiến dịch"],
    ["devices", "device", "Thiết bị"],
    ["results", "history", "Kết quả"],
    ["settings", "settings", "Cài đặt"],
  ];
  const title = nav.find((n) => n[0] === page)[2];
  const campaignList = (
    <div className="campaign-list">
      {data.campaigns.length ? (
        data.campaigns.map((c) => (
          <article className="campaign-card" key={c.id}>
            <div className="campaign-emblem">
              <Icon name={c.mode === "gemini" ? "spark" : "campaign"} />
            </div>
            <div className="campaign-main">
              <div className="row">
                <h3>{c.name}</h3>
                <span className={`badge ${c.enabled ? "success" : ""}`}>
                  {c.enabled ? "Đã bật lịch" : "Chạy thủ công"}
                </span>
              </div>
              <p>
                {c.mode === "gemini" ? "Gemini" : "Bài tự soạn"} <span>·</span>{" "}
                {c.posts.filter((p) => p.selected).length} bài được chọn{" "}
                <span>·</span> {c.dailyLimit} lượt/ngày
              </p>
              <small>
                {c.enabled
                  ? `${c.time} · ${c.weekdays.map((d) => (d === 0 ? "CN" : `T${d + 1}`)).join(", ")}`
                  : "Chưa bật lịch tự động"}
              </small>
            </div>
            <div className="campaign-actions">
              <button className="secondary" onClick={() => setEditor(c.id)}>
                Chỉnh sửa
              </button>
              <button
                className="primary small"
                disabled={busy}
                onClick={() =>
                  action(
                    () => api(`/campaigns/${c.id}/run`, "POST", {}),
                    "Đã xếp lượt chạy. Ứng dụng sẽ nhận khi kết nối và đã đăng nhập Facebook.",
                  )
                }
              >
                <Icon name="play" size={16} />
                Chạy
              </button>
            </div>
          </article>
        ))
      ) : (
        <Empty
          title="Chiến dịch đầu tiên bắt đầu từ bạn"
          text="Chọn bài có sẵn hoặc nhờ Gemini viết, rồi thiết lập nhóm và lịch chạy."
          action={
            <button className="primary" onClick={() => setEditor("new")}>
              <Icon name="plus" />
              Tạo chiến dịch
            </button>
          }
        />
      )}
    </div>
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="workspace">
          <span className="workspace-avatar">
            {data.user.name[0].toUpperCase()}
          </span>
          <div>
            <strong>Không gian của bạn</strong>
            <small>Tài khoản cá nhân</small>
          </div>
        </div>
        <span className="nav-label">QUẢN LÝ</span>
        <nav>
          {nav.map(([key, icon, label]) => (
            <button
              key={key}
              className={page === key ? "active" : ""}
              onClick={() => {
                setPage(key);
                setNotice("");
                setError("");
              }}
            >
              <Icon name={icon} />
              {label}
              {key === "campaigns" && (
                <span className="nav-count">{data.campaigns.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="device-mini">
            <span className={`dot ${online ? "online" : ""}`} />
            <div>
              <strong>
                {online ? "Máy tính đang kết nối" : "Chưa có máy online"}
              </strong>
              <small>{online ? device.name : "Kết nối để bắt đầu chạy"}</small>
            </div>
          </div>
          <button
            className="profile"
            onClick={() =>
              action(async () => {
                await api("/auth/logout", "POST", {});
                setData(null);
              })
            }
          >
            <span>{data.user.name[0].toUpperCase()}</span>
            <div>
              <strong>{data.user.name}</strong>
              <small>Đăng xuất</small>
            </div>
            <Icon name="logout" size={17} />
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span>
            Không gian làm việc <span className="slash">/</span>{" "}
            <strong>{title}</strong>
          </span>
          <button
            className="download-link"
            onClick={() => {
              if (meta.downloadAvailable)
                window.location.href = "/api/download";
              else {
                setPage("devices");
                setNotice("Bộ cài chưa được chủ website phát hành.");
              }
            }}
          >
            <Icon name="download" size={17} />
            Tải ứng dụng Windows
          </button>
        </header>
        <div className="page">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {new Date().toLocaleDateString("vi-VN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </span>
              <h1>
                {page === "overview"
                  ? `Chào ${data.user.name.split(" ").at(-1)}, cùng bắt đầu nhé.`
                  : title}
              </h1>
              <p>
                {page === "overview"
                  ? "Chuẩn bị nội dung tốt. Để BotAds theo lịch bạn chọn."
                  : page === "campaigns"
                    ? "Mỗi ý tưởng, một chiến dịch có thể theo dõi."
                    : page === "devices"
                      ? "Kết nối máy tính để thực hiện công việc từ website."
                      : page === "results"
                        ? "Theo dõi kết quả thực tế của từng lượt gửi."
                        : "Điều chỉnh giới hạn chung cho tài khoản của bạn."}
              </p>
            </div>
            {["overview", "campaigns"].includes(page) && (
              <button className="primary" onClick={() => setEditor("new")}>
                <Icon name="plus" />
                Tạo chiến dịch
              </button>
            )}
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button onClick={() => setError("")}>×</button>
            </div>
          )}
          {notice && (
            <div className="alert success" role="status">
              {notice}
              <button onClick={() => setNotice("")}>×</button>
            </div>
          )}
          {page === "overview" && (
            <>
              <section className="hero">
                <div>
                  <span className="hero-tag">
                    <span className="dot online" /> TỰ ĐỘNG THEO CÁCH CỦA BẠN
                  </span>
                  <h2>
                    Bài của bạn.
                    <br />
                    Đến đúng cộng đồng.
                  </h2>
                  <p>
                    Tự soạn hay nhờ Gemini, bạn chọn nội dung.
                    <br />
                    BotAds giúp thực hiện và ghi lại từng bước.
                  </p>
                  <button onClick={() => setEditor("new")}>
                    Bắt đầu một chiến dịch <Icon name="arrow" size={18} />
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="floating-card content-card">
                    <span className="mini-icon">
                      <Icon name="campaign" />
                    </span>
                    <strong>Nội dung đã sẵn sàng</strong>
                    <div className="fake-line" />
                    <div className="fake-line short" />
                    <span className="mini-pill">Bài viết + ảnh</span>
                  </div>
                  <div className="floating-card schedule-card">
                    <span className="mini-icon">
                      <Icon name="history" />
                    </span>
                    <div>
                      <small>Lịch của bạn</small>
                      <strong>09:00</strong>
                    </div>
                    <Icon name="check" />
                  </div>
                  <div className="spark-decoration">✳</div>
                </div>
              </section>
              <section className="stats">
                <div>
                  <span>
                    Lượt gửi hôm nay
                    <Icon name="campaign" />
                  </span>
                  <strong>
                    {data.usage}
                    <small>/ {data.settings.dailyLimit}</small>
                  </strong>
                  <p>Bao gồm bài chờ và chưa xác nhận</p>
                </div>
                <div>
                  <span>
                    Chiến dịch bật lịch
                    <Icon name="history" />
                  </span>
                  <strong>
                    {data.campaigns
                      .filter((c) => c.enabled)
                      .length.toString()
                      .padStart(2, "0")}
                  </strong>
                  <p>Tự chạy khi thiết bị kết nối</p>
                </div>
                <div>
                  <span>
                    Thiết bị
                    <Icon name="device" />
                  </span>
                  <strong className="device-stat">
                    {online ? "Đang online" : "Chưa kết nối"}
                  </strong>
                  <p>
                    {device ? device.name : "Cài BotAds để liên kết máy tính"}
                  </p>
                </div>
              </section>
              <div className="section-title">
                <h2>Chiến dịch của bạn</h2>
                <button className="link" onClick={() => setPage("campaigns")}>
                  Xem tất cả ↗
                </button>
              </div>
              {campaignList}
            </>
          )}
          {page === "campaigns" && campaignList}
          {page === "devices" && (
            <>
              <div className="connect-grid">
                <section className="panel">
                  <span className="number">01</span>
                  <h2>Cài BotAds trên Windows</h2>
                  <p>
                    Tải bộ cài, mở và làm theo hướng dẫn. Bạn không cần cài
                    Node.js hay mở code.
                  </p>
                  <button
                    className="primary"
                    disabled={!meta.downloadAvailable}
                    onClick={() => (window.location.href = "/api/download")}
                  >
                    <Icon name="download" />
                    Tải cho Windows
                  </button>
                  {!meta.downloadAvailable && (
                    <small className="block">
                      Bộ cài chưa được phát hành trên website này.
                    </small>
                  )}
                </section>
                <section className="panel">
                  <span className="number">02</span>
                  <h2>Ghép máy tính của bạn</h2>
                  <p>
                    Trong ứng dụng, nhập địa chỉ website và mã bên dưới. Mã có
                    hiệu lực 10 phút, dùng một lần.
                  </p>
                  <div className="copy-value">{window.location.origin}</div>
                  <button
                    className="secondary"
                    disabled={busy || !!device}
                    onClick={() =>
                      action(async () =>
                        setPair((await api("/pairings", "POST", {})).code),
                      )
                    }
                  >
                    Tạo mã liên kết
                  </button>
                  {pair && <div className="pair-code">{pair}</div>}
                </section>
              </div>
              <section className="panel">
                <div className="section-title">
                  <h2>Máy đã liên kết</h2>
                  <span className="badge">1 máy / tài khoản</span>
                </div>
                {device ? (
                  <div className="device-row">
                    <Icon name="device" size={35} />
                    <div>
                      <h3>{device.name}</h3>
                      <p>
                        <span className={`dot ${online ? "online" : ""}`} />
                        {online ? "Đang kết nối" : "Offline"} · Facebook{" "}
                        {device.facebook_ready
                          ? "đã kết nối"
                          : "chưa đăng nhập"}
                      </p>
                      <small>Lần cuối: {date(device.last_seen)}</small>
                    </div>
                    <button
                      className="secondary danger"
                      onClick={() => {
                        if (
                          confirm(
                            "Thu hồi liên kết máy này? Các lượt đang chạy sẽ được yêu cầu dừng.",
                          )
                        )
                          action(
                            () => api(`/devices/${device.id}`, "DELETE"),
                            "Đã thu hồi thiết bị.",
                          );
                      }}
                    >
                      Thu hồi
                    </button>
                  </div>
                ) : (
                  <Empty
                    title="Chưa có thiết bị"
                    text="Cài ứng dụng và nhập mã liên kết để máy tính xuất hiện tại đây."
                  />
                )}
              </section>
              <div className="notice">
                Sau khi ghép, bấm Kết nối Facebook trong ứng dụng và tự đăng
                nhập. Máy cần bật, có mạng và ứng dụng đang chạy; đóng tab
                website vẫn tiếp tục được.
              </div>
            </>
          )}
          {page === "results" && (
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
                                {data.campaigns.find(
                                  (c) => c.id === j.campaign_id,
                                )?.name || "Chiến dịch"}
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
                              {!!j.cancel_requested &&
                                j.status === "running" && (
                                  <small className="block">
                                    Đang yêu cầu dừng
                                  </small>
                                )}
                            </td>
                            <td>
                              <button
                                className="link"
                                onClick={() =>
                                  action(async () =>
                                    setEvents(
                                      (await api(`/jobs/${j.id}/events`))
                                        .events,
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
                                      () =>
                                        api(`/jobs/${j.id}/cancel`, "POST", {}),
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
                      ? events
                          .map((e) => `${date(e.created_at)}  ${e.text}`)
                          .join("\n")
                      : "Chưa có nhật ký từ thiết bị."}
                  </pre>
                </section>
              )}
              <section className="panel">
                <h2>Kết quả từng bài</h2>
                {!data.attempts.length ? (
                  <p className="hint">
                    Chưa có lượt gửi. Chỉ khi xác nhận được bài, hệ thống mới
                    ghi “Đã xuất bản”.
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
                                <small className="block danger">
                                  {a.error}
                                </small>
                              )}
                            </td>
                            <td>
                              <Badge status={a.status} />
                            </td>
                            <td>
                              {a.comment ? (
                                <Badge status={a.comment.status} />
                              ) : (
                                "—"
                              )}
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
          )}
          {page === "settings" && (
            <section className="panel settings-panel">
              <h2>Giới hạn tài khoản</h2>
              <p>
                Tổng lượt gửi của mọi chiến dịch trên cùng tài khoản Facebook.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  action(
                    () => api("/settings", "PUT", { dailyLimit: limit }),
                    "Đã lưu giới hạn tài khoản.",
                  );
                }}
              >
                <label>
                  Tối đa lượt gửi mỗi ngày
                  <input
                    type="number"
                    min="1"
                    max={meta.maxDaily}
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                  />
                  <small>
                    Bạn có thể chọn 30, 50 hoặc số khác trong khoảng 1–
                    {meta.maxDaily}.
                  </small>
                </label>
                <label>
                  Múi giờ
                  <input value={data.settings.timezone} readOnly />
                </label>
                <div className="notice">
                  Hạn mức tính cả bài đang gửi, chờ duyệt và chưa xác nhận. Mỗi
                  chiến dịch còn có giới hạn riêng.
                </div>
                <button className="primary" disabled={busy}>
                  Lưu thay đổi
                </button>
              </form>
            </section>
          )}
          <footer className="page-footer">
            BotAds · Nội dung do bạn chọn, tiến độ được ghi nhận.
            <span>Máy tính cần online để chạy.</span>
          </footer>
        </div>
      </main>
      {editor && (
        <Editor
          key={editor}
          value={selectedCampaign}
          assets={data.assets}
          meta={meta}
          onClose={() => setEditor(null)}
          onSaved={refresh}
          onUpload={upload}
        />
      )}
    </div>
  );
}
