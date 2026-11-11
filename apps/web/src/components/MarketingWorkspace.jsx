import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { linkedinErrors } from "../../../../packages/contracts/linkedin-errors.mjs";
import "../marketing.css";

import { emptyBrand } from "./marketing/constants";
import MarketingHeader from "./marketing/MarketingHeader";
import MarketingFilters from "./marketing/MarketingFilters";
import MarketingTabsView from "./marketing/MarketingTabsView";
import MarketingModals from "./marketing/MarketingModals";

export default function MarketingWorkspace({ user, assets, onUpload, navigation, onSnapshot, onConnectChannel }) {
  const [data, setData] = useState(null), [brandId, setBrandId] = useState(""), [tab, setTab] = useState("home");
  const [channelFilter, setChannelFilter] = useState(""), [publicationView, setPublicationView] = useState("list"), [statusFilter, setStatusFilter] = useState("all"), [search, setSearch] = useState("");
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false), [editor, setEditor] = useState(null);
  const [brandForm, setBrandForm] = useState(null), [connection, setConnection] = useState({ provider: "dev", apiKey: "", name: "" });
  const [schedule, setSchedule] = useState(null), [confirm, setConfirm] = useState(null), [metrics, setMetrics] = useState(null), [showPublication, setShowPublication] = useState(null), [notPosted, setNotPosted] = useState(null);

  async function load() {
    const next = await api("/marketing");
    setData(next); onSnapshot?.(next); setBrandId((curr) => curr || next.brands[0]?.id || "");
  }

  useEffect(() => {
    if (!navigation) return;
    if (navigation.subview === "community") setTab("community");
    else if (navigation.subview === "insights") setTab("insights");
    else if (navigation.subview === "publish") setTab("publications");
    else if (navigation.tab) setTab(navigation.tab);
    if (navigation.brandId) setBrandId(navigation.brandId);
    setChannelFilter(navigation.channelId || "");
    setStatusFilter("all"); setSearch("");
    if (navigation.compose) setEditor("new");
  }, [navigation]);

  useEffect(() => {
    let alive = true;
    const refresh = () => { if (alive) load().catch((e) => { if (alive) setError(e.message); }); };
    refresh();
    const timer = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 15000);
    const params = new URLSearchParams(window.location.search);
    if (params.has("linkedin") || params.has("bluesky")) {
      setTab("channels");
      const isLi = params.has("linkedin"), isOk = (isLi ? params.get("linkedin") : params.get("bluesky")) === "connected";
      if (isOk) setNotice(`Đã kết nối ${isLi ? "LinkedIn" : "Bluesky"} thành công! Bạn có thể duyệt bài và lên lịch.`);
      else setError(isLi ? (linkedinErrors[params.get("linkedin_reason")] || linkedinErrors.failed) : "Không thể kết nối Bluesky. Vui lòng thử lại.");
      ["linkedin", "linkedin_reason", "bluesky", "bluesky_reason"].forEach((k) => params.delete(k));
      window.history.replaceState(null, "", window.location.pathname + (params.size ? `?${params}` : "") + window.location.hash);
    }
    return () => { alive = false; clearInterval(timer); };
  }, []);

  async function action(fn, message) {
    setBusy(true); setError(""); setNotice("");
    try {
      await fn(); await load();
      if (message) setNotice(message);
      return true;
    } catch (e) { setError(e.message); return false; } finally { setBusy(false); }
  }

  if (!data) {
    return (
      <section className="panel">
        <h2>Marketing đa kênh</h2>
        {error ? <p role="alert" className="danger">{error}</p> : <p>Đang tải nội dung…</p>}
        <button className="link" onClick={() => load().catch((e) => setError(e.message))}>Tải lại</button>
      </section>
    );
  }

  const brands = data.brands,
    channels = data.channels.filter((c) => c.brand_id === brandId),
    posts = data.posts.filter((p) => p.brand_id === brandId),
    allPublications = data.publications.filter((p) => channels.some((c) => c.id === p.channel_id));

  const publications = allPublications.filter((p) =>
    (!channelFilter || p.channel_id === channelFilter) &&
    (statusFilter === "all" ||
      (statusFilter === "pending" ? ["scheduled", "publishing", "retry_wait"].includes(p.status) :
       statusFilter === "attention" ? ["failed", "unknown", "needs_reauth", "awaiting_manual"].includes(p.status) :
       ["published", "user_reported_published"].includes(p.status))) &&
    (!search || `${p.snapshot.postTitle} ${p.snapshot.content}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
  );

  const handleNewPost = async () => {
    if (!brands.length) {
      try {
        const res = await api("/marketing/brands", "POST", {
          name: "My organization", website: "https://botads.com", audience: "General audience", language: "vi",
        });
        setBrandId(res.id);
        await load();
      } catch (err) { console.warn("Auto-create brand:", err); }
    }
    setEditor("new");
  };

  const channelFor = (p) => data.channels.find((c) => c.id === p.channel_id);

  return (
    <div className="mk-workspace">
      {error && <div className="alert error" role="alert">{error}<button onClick={() => setError("")}>×</button></div>}
      {notice && <div className="alert success" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}

      {tab === "home" && (
        <MarketingHeader
          userName={user?.name || ""}
          brandName={brands.find((b) => b.id === brandId)?.name || "Creator"}
          brandsCount={brands.length}
          publications={publications}
          postsCount={posts.length}
          pendingCount={publications.filter((p) => ["scheduled", "retry_wait", "publishing"].includes(p.status)).length}
          publishedCount={publications.filter((p) => ["published", "user_reported_published"].includes(p.status)).length}
          hasChannels={channels.filter((c) => c.status === "connected").length > 0}
          onConnectChannel={() => setTab("channels")}
          onNewPost={handleNewPost}
          onAddBrand={() => setBrandForm({ ...emptyBrand })}
        />
      )}

      {brands.length > 0 && !["channels", "home", "community", "insights"].includes(tab) && (
        <MarketingFilters
          search={search} setSearch={setSearch} channelFilter={channelFilter} setChannelFilter={setChannelFilter}
          channels={channels} tab={tab} publicationView={publicationView} setPublicationView={setPublicationView}
        />
      )}

      {tab !== "home" && (
        <MarketingTabsView
          tab={tab} brands={brands} channels={channels} posts={posts}
          publications={publications} allPublications={allPublications}
          channelFilter={channelFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          search={search} publicationView={publicationView} channelFor={channelFor}
          connection={connection} setConnection={setConnection} capabilities={data.capabilities} busy={busy}
          onStartBrand={() => setBrandForm({ ...emptyBrand })} onEditor={setEditor}
          onApprove={(post) => action(() => api(`/marketing/posts/${post.id}/approve`, "POST", { revision: post.revision }), "Đã duyệt phiên bản hiện tại. Bạn có thể lên lịch.")}
          onOpenSchedule={(post) => setSchedule(post)}
          onChannelSubmit={async (e) => {
            e.preventDefault();
            const ok = await action(async () => {
              if (connection.provider === "linkedin" || (connection.provider === "bluesky" && !connection.apiKey)) {
                const res = await api(`/marketing/${connection.provider}/start`, "POST", { brandId });
                window.location.assign(res.url);
              } else if (connection.provider === "bluesky") {
                await api("/marketing/channels/bluesky", "POST", { brandId, handle: connection.name, appPassword: connection.apiKey });
              } else await api(`/marketing/channels/${connection.provider === "dev" ? "dev" : "manual"}`, "POST", { brandId, ...connection });
            }, "Đã thêm tài khoản kênh.");
            if (ok) setConnection((c) => ({ ...c, apiKey: "", name: "" }));
          }}
          onDisconnectChannel={(cId) => action(() => api(`/marketing/channels/${cId}`, "DELETE"), "Đã ngắt kết nối và hủy các lượt chưa gửi của tài khoản này.")}
          onDispatch={() => action(() => api("/marketing/dispatch", "POST", {}), "Đã yêu cầu xử lý những bài API đến hạn. Kết quả sẽ tự cập nhật.")}
          onShowDetails={setShowPublication} onConfirmModal={setConfirm} onNotPostedModal={setNotPosted} onMetricsModal={setMetrics}
          onRetry={(p) => action(() => api(`/marketing/publications/${p.id}/retry`, "POST", {}), "Đã xếp lại. Bấm xử lý bài đến hạn hoặc chờ lịch tự động.")}
          onCancel={(p) => action(() => api(`/marketing/publications/${p.id}/cancel`, "POST", {}), "Đã yêu cầu hủy. Bài nền tảng đã nhận không thể thu hồi bằng thao tác này.")}
          setNotice={setNotice} setError={setError}
        />
      )}

      <MarketingModals
        brandForm={brandForm} setBrandForm={setBrandForm} onSaveBrand={(bf) => action(async () => { const res = await api("/marketing/brands", "POST", bf); setBrandId(res.id); setBrandForm(null); }, "Đã thêm thương hiệu.")}
        editor={editor} setEditor={setEditor} brands={brands} brandId={brandId} assets={assets} onUpload={onUpload}
        onConnectChannel={onConnectChannel || (() => setTab("channels"))} channelFilter={channelFilter}
        onSavePost={async (post) => {
          const res = await api(`/marketing/posts${editor === "new" ? "" : `/${editor.id}`}`, editor === "new" ? "POST" : "PUT", post);
          const pid = editor === "new" ? res.id : editor.id, rev = editor?.revision || 1;
          if (post.publishNow || post.scheduledAt) {
            try {
              await api(`/marketing/posts/${pid}/approve`, "POST", { revision: rev });
              const chs = channels.filter((c) => c.status === "connected" && post.variants.some((v) => v.provider === c.provider));
              if (chs.length) {
                const schedTime = post.publishNow ? new Date().toISOString() : post.scheduledAt;
                await api(`/marketing/posts/${pid}/schedule`, "POST", { revision: rev, channelIds: chs.map((c) => c.id), scheduledAt: schedTime });
                if (post.publishNow) { try { await api("/marketing/dispatch", "POST", {}); } catch {} }
                await load(); setTab("publications"); setChannelFilter(""); setNotice(post.publishNow ? "Đã xuất bản và kiểm tra kết quả trên kênh kết nối." : "Đã lên lịch đăng bài thành công.");
                return;
              }
            } catch (err) { setNotice(`Đã lưu bài: ${err.message}`); }
          }
          await load(); setTab("content"); setNotice("Đã lưu bản nháp. Xem lại và duyệt trước khi đặt lịch.");
        }}
        schedule={schedule} setSchedule={setSchedule} channels={channels}
        onScheduleConfirm={(payload) => action(async () => {
          await api(`/marketing/posts/${schedule.id}/schedule`, "POST", payload);
          try { await api("/marketing/dispatch", "POST", {}); } catch {}
          setSchedule(null); setTab("publications");
        }, "Đã lưu lịch và kiểm tra trạng thái xuất bản.")}
        confirm={confirm} setConfirm={setConfirm}
        onConfirmPermalink={(permalink) => action(async () => { await api(`/marketing/publications/${confirm.id}/confirm`, "POST", { permalink }); setConfirm(null); }, "Đã ghi nhận xác nhận của bạn; đây không phải xác minh tự động từ API.")}
        metrics={metrics} setMetrics={setMetrics}
        onSaveMetrics={(m) => action(async () => { await api(`/marketing/publications/${metrics.id}/metrics`, "POST", m); setMetrics(null); }, "Đã lưu số liệu nhập tay.")}
        notPosted={notPosted} setNotPosted={setNotPosted} error={error}
        onSaveNotPosted={(np) => action(async () => { await api(`/marketing/publications/${notPosted.id}/not-posted`, "POST", np); setNotPosted(null); }, "Đã ghi nhận kiểm tra của bạn. Bạn có thể chủ động thử lại trong danh sách.")}
        showPublication={showPublication} setShowPublication={setShowPublication} channelFor={channelFor} attempts={data.attempts}
        busy={busy}
      />
    </div>
  );
}
