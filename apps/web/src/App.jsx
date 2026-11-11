import React, { useState, useEffect } from "react";
import { api, readApiResponse } from "./lib/api";
import { Icon, Brand, Badge, Empty, date, BufferLayersIcon } from "./components/ui";
import Auth from "./pages/Auth";
import Editor from "./components/CampaignEditor";
import MarketingWorkspace from "./components/MarketingWorkspace";
import LegalLinks from "./components/LegalLinks";
import { ChannelMark } from "./components/PublishingViews";
import GoogleAccount from "./components/GoogleAccount";
import UserProfileMenu from "./components/UserProfileMenu";
import ConnectChannelModal from "./components/marketing/ConnectChannelModal";
import { googleAuthErrors } from "../../../packages/contracts/google-auth.mjs";
export default function App() {
  const [meta, setMeta] = useState({ maxDaily: 100, registrationOpen: true }),
    [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState(() =>
      new URLSearchParams(window.location.search).get("google_auth") ===
      "linked"
        ? "settings"
        : "marketing",
    ),
    [editor, setEditor] = useState(null),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [pair, setPair] = useState(""),
    [events, setEvents] = useState(null),
    [busy, setBusy] = useState(false),
    [limit, setLimit] = useState(30),
    [showQuotaCard, setShowQuotaCard] = useState(true),
    [showConnectChannelModal, setShowConnectChannelModal] = useState(false),
    [marketingData, setMarketingData] = useState(null),
    [marketingNavigation, setMarketingNavigation] = useState(null);
  const refresh = async () => {
    try {
      const [d, m] = await Promise.all([
        api("/dashboard"),
        api("/marketing").catch(() => null),
      ]);
      setData(d);
      if (m) setMarketingData(m);
      setLimit(d.settings.dailyLimit);
      return d;
    } catch (e) {
      if (e.status === 401) setData(null);
      else setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  const handleConnectNewChannel = async ({ provider, name, apiKey }) => {
    setBusy(true);
    setError("");
    try {
      let brandId = marketingData?.brands?.[0]?.id;
      if (!brandId) {
        try {
          const m = await api("/marketing");
          setMarketingData(m);
          brandId = m.brands?.[0]?.id;
        } catch {}
      }
      if (!brandId) {
        const bRes = await api("/marketing/brands", "POST", {
          name: data?.user?.name ? `${data.user.name}'s Brand` : "My Organization",
          website: "https://bot.salesora.space",
          audience: "All",
          language: "vi",
          ctaUrl: "https://bot.salesora.space",
        });
        brandId = bRes.id;
      }
      if (provider === "linkedin" || (provider === "bluesky" && !apiKey)) {
        const res = await api(`/marketing/${provider}/start`, "POST", { brandId });
        window.location.assign(res.url);
        return;
      }
      if (provider === "dev") {
        await api("/marketing/channels/dev", "POST", { brandId, apiKey });
      } else if (provider === "bluesky") {
        await api("/marketing/channels/bluesky", "POST", {
          brandId,
          handle: name,
          appPassword: apiKey,
        });
      } else {
        await api("/marketing/channels/manual", "POST", { brandId, provider, name });
      }
      const mRes = await api("/marketing");
      setMarketingData(mRes);
      setNotice(`Đã kết nối kênh ${name} thành công.`);
    } catch (err) {
      setError(err.message || "Không thể kết nối kênh.");
    } finally {
      setBusy(false);
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
    const url = new URL(window.location.href),
      result = url.searchParams.get("google_auth"),
      avatar = url.searchParams.get("avatar");
    if (avatar) {
      try {
        localStorage.setItem("user_avatar", avatar);
      } catch {}
      url.searchParams.delete("avatar");
    }
    if (result) {
      if (result === "linked") {
        setPage("settings");
        setNotice("Đã liên kết tài khoản Google.");
      } else if (result !== "success") {
        setPage("settings");
        setError(
          Object.hasOwn(googleAuthErrors, result)
            ? googleAuthErrors[result]
            : googleAuthErrors.failed,
        );
      }
      url.searchParams.delete("google_auth");
      window.history.replaceState(
        null,
        "",
        url.pathname + url.search + url.hash,
      );
    }
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
    const result = await readApiResponse(r);
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
    ["marketing", "campaign", "Marketing đa kênh"],
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
  const handleCreateNew = async () => {
    setPage("marketing");
    if (!marketingData?.brands?.length) {
      try {
        const res = await api("/marketing/brands", "POST", {
          name: "My organization",
          website: "https://botads.com",
          audience: "General audience",
          language: "vi",
        });
        setMarketingNavigation({
          tab: "content",
          brandId: res.id,
          compose: true,
        });
        return;
      } catch (e) {
        // fallback
      }
    }
    setMarketingNavigation((curr) => ({
      ...curr,
      tab: curr?.tab || "content",
      compose: true,
    }));
  };

  return (
    <div className="app-shell publishing-shell">
      <aside className="sidebar buffer-authentic-sidebar">
        <div className="buffer-sidebar-header">
          <div className="buffer-logo-wrap">
            <span className="buffer-brand-icon">
              <BufferLayersIcon size={18} />
            </span>
            <span className="buffer-logo-text">botsalesora<span className="brand-dot">.</span></span>
          </div>
        </div>

        <button
          type="button"
          className="primary sidebar-new buffer-sidebar-new-btn"
          onClick={handleCreateNew}
        >
          <Icon name="plus" size={17} /> New
        </button>

        <nav className="buffer-sidebar-main-nav">
          <button
            type="button"
            className={page === "overview" || (page === "marketing" && (!marketingNavigation?.subview || marketingNavigation?.subview === "home") && !marketingNavigation?.compose) ? "active" : ""}
            onClick={() => {
              setPage("marketing");
              setMarketingNavigation({ tab: "home", subview: "home" });
            }}
          >
            <span className="sidebar-nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </span>
            <span>Home</span>
          </button>
          <button
            type="button"
            className={page === "marketing" && marketingNavigation?.tab === "content" && !marketingNavigation?.compose ? "active" : ""}
            onClick={() => {
              setPage("marketing");
              setMarketingNavigation({ tab: "content", subview: "create" });
            }}
          >
            <span className="sidebar-nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="9" y1="18" x2="15" y2="18" />
                <line x1="10" y1="22" x2="14" y2="22" />
                <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
              </svg>
            </span>
            <span>Create</span>
          </button>
        </nav>

        <div className="sidebar-channels buffer-sidebar-channels-tree">
          <div className="sidebar-channel-heading">
            <span className="channel-heading-label">Channels</span>
            <div className="channel-heading-actions">
              <button
                type="button"
                className="channel-gear-btn"
                aria-label="Cài đặt"
                title="Cài đặt"
                onClick={() => setPage("settings")}
              >
                <Icon name="settings" size={15} />
              </button>
              <button
                type="button"
                className="channel-add-action-btn"
                aria-label="Kết nối thêm kênh"
                title="Thêm kênh mới"
                onClick={() => setShowConnectChannelModal(true)}
              >
                <Icon name="plus" size={15} />
              </button>
            </div>
          </div>

          <div className="buffer-channels-tree-list">
            {marketingData?.channels
              .filter((c) => c.status !== "disconnected")
              .map((c) => {
                const isSelected = marketingNavigation?.channelId === c.id;
                return (
                  <div key={c.id} className="buffer-channel-node">
                    <button
                      type="button"
                      className={`channel-branch-header sidebar-channel ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setPage("marketing");
                        setMarketingNavigation({
                          tab: "publications",
                          brandId: c.brand_id,
                          channelId: c.id,
                        });
                      }}
                    >
                      <div className="channel-avatar-badge-wrap">
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt={c.name} className="channel-avatar-circle" />
                        ) : (
                          <span className="channel-avatar-circle">{c.name[0].toUpperCase()}</span>
                        )}
                        <ChannelMark provider={c.provider} size="mini" />
                      </div>
                      <span className="channel-row-name">{c.name}</span>
                    </button>
                    <div className="buffer-channel-subnav">
                      <button
                        type="button"
                        className={`channel-subitem ${isSelected && (!marketingNavigation?.subview || marketingNavigation?.subview === "publish") ? "active" : ""}`}
                        onClick={() => {
                          setPage("marketing");
                          setMarketingNavigation({
                            tab: "publications",
                            brandId: c.brand_id,
                            channelId: c.id,
                            subview: "publish",
                          });
                        }}
                      >
                        <span className="subitem-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                        </span>
                        <span>Publish</span>
                      </button>
                      <button
                        type="button"
                        className={`channel-subitem ${isSelected && marketingNavigation?.subview === "community" ? "active" : ""}`}
                        onClick={() => {
                          setPage("marketing");
                          setMarketingNavigation({
                            tab: "community",
                            brandId: c.brand_id,
                            channelId: c.id,
                            subview: "community",
                          });
                        }}
                      >
                        <span className="subitem-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        </span>
                        <span>Community</span>
                      </button>
                      <button
                        type="button"
                        className={`channel-subitem ${isSelected && marketingNavigation?.subview === "insights" ? "active" : ""}`}
                        onClick={() => {
                          setPage("marketing");
                          setMarketingNavigation({
                            tab: "insights",
                            brandId: c.brand_id,
                            channelId: c.id,
                            subview: "insights",
                          });
                        }}
                      >
                        <span className="subitem-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="20" x2="18" y2="10" />
                            <line x1="12" y1="20" x2="12" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="14" />
                          </svg>
                        </span>
                        <span>Insights</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="buffer-connect-more-box">
            <span className="connect-more-title">Connect more channels</span>
            <div className="connect-more-icons">
              <button
                type="button"
                className="connect-badge-btn instagram"
                title="Instagram"
                onClick={() => setShowConnectChannelModal(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </button>
              <button
                type="button"
                className="connect-badge-btn threads"
                title="Threads"
                onClick={() => setShowConnectChannelModal(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
                </svg>
              </button>
              <button
                type="button"
                className="connect-badge-btn bluesky"
                title="Bluesky"
                onClick={() => setShowConnectChannelModal(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 10.8c-1.08-2.08-3.08-5.3-5.5-6.8C3.8 2.2 2 3.1 2 5.5c0 1.2.6 6.3 1 7.4 1.4 3.7 4.5 4.6 7 4.1-3.6 1.8-6.9 4.3-3.6 8 3.8 4.3 5.6-2.5 5.6-2.5s1.8 6.8 5.6 2.5c3.3-3.7 0-6.2-3.6-8 2.5.5 5.6-.4 7-4.1.4-1.1 1-6.2 1-7.4 0-2.4-1.8-3.3-4.5-1.5-2.42 1.5-4.42 4.72-5.5 6.8z" />
                </svg>
              </button>
              <button
                type="button"
                className="connect-badge-btn add"
                title="Kết nối kênh mới"
                onClick={() => setShowConnectChannelModal(true)}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="sidebar-bottom buffer-sidebar-bottom">
          {showQuotaCard && (() => {
            const connectedChannelsCount =
              marketingData?.channels?.filter((c) => c.status === "connected").length || 0;
            return (
              <div className="buffer-channel-quota-card">
                <div className="quota-card-header">
                  <span>{Math.min(3, connectedChannelsCount)}/3 channels connected</span>
                  <button
                    type="button"
                    className="quota-close-btn"
                    aria-label="Đóng"
                    onClick={() => setShowQuotaCard(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="quota-progress-bar">
                  <div className={`progress-seg ${connectedChannelsCount >= 1 ? "is-filled" : ""}`} />
                  <div className={`progress-seg ${connectedChannelsCount >= 2 ? "is-filled" : ""}`} />
                  <div className={`progress-seg ${connectedChannelsCount >= 3 ? "is-filled" : ""}`} />
                </div>
              </div>
            );
          })()}

          <UserProfileMenu
            user={data.user}
            hasQuotaCard={showQuotaCard}
            onLogout={() =>
              action(async () => {
                await api("/auth/logout", "POST", {});
                try {
                  localStorage.removeItem("user_avatar");
                } catch {}
                setData(null);
              })
            }
            onNavigate={(target) => {
              if (target === "settings") {
                setPage("settings");
              } else if (target === "marketing-channels") {
                setPage("marketing");
                setMarketingNavigation({ tab: "channels" });
              }
            }}
          />
        </div>
      </aside>
      <main className="main">
        {page !== "marketing" && (
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
        )}
        <div className={`page ${page === "marketing" ? "buffer-marketing-page" : ""}`}>
          {page !== "marketing" && (
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
          )}
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
          {page === "marketing" && (
            <MarketingWorkspace
              user={data?.user}
              assets={data.assets}
              onUpload={upload}
              navigation={marketingNavigation}
              onSnapshot={setMarketingData}
              onConnectChannel={() => setShowConnectChannelModal(true)}
            />
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
          {page === "settings" && <GoogleAccount />}
          {page === "settings" && (
            <section className="panel settings-panel">
              <h2>Giới hạn tài khoản</h2>
              <p>
                Giới hạn/ngày cho Facebook và marketing API, tính riêng từng
                luồng. Marketing tính theo múi giờ bên dưới.
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
            <span>
              {page === "marketing"
                ? "Kênh API chạy trên cloud. Facebook dùng ứng dụng Windows."
                : "Máy tính cần online để chạy Facebook."}
            </span>
          </footer>
          <LegalLinks />
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
      <ConnectChannelModal
        isOpen={showConnectChannelModal}
        onClose={() => setShowConnectChannelModal(false)}
        channels={marketingData?.channels || []}
        onConnectChannel={handleConnectNewChannel}
        busy={busy}
        error={error}
      />
    </div>
  );
}
