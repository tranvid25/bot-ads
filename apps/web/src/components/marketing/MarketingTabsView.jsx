import React from "react";
import { PublishingCalendar } from "../PublishingViews";
import ChannelPicker from "./ChannelPicker";
import ChannelAccountForm from "./ChannelAccountForm";
import BrandChannelList from "./BrandChannelList";
import ContentList from "./ContentList";
import CreateIdeasView from "./CreateIdeasView";
import PublicationTable from "./PublicationTable";
import CommunityView from "./CommunityView";
import InsightsView from "./InsightsView";

export default function MarketingTabsView({
  tab,
  brands,
  channels,
  posts,
  publications,
  allPublications,
  channelFilter,
  statusFilter,
  setStatusFilter,
  search,
  publicationView,
  channelFor,
  connection,
  setConnection,
  capabilities,
  busy,
  onStartBrand,
  onEditor,
  onApprove,
  onOpenSchedule,
  onChannelSubmit,
  onDisconnectChannel,
  onDispatch,
  onShowDetails,
  onConfirmModal,
  onNotPostedModal,
  onMetricsModal,
  onRetry,
  onCancel,
  setNotice,
  setError,
}) {
  if (tab === "channels") {
    return (
      <>
        <ChannelPicker
          brands={brands}
          connection={connection}
          setConnection={setConnection}
          onStartBrand={onStartBrand}
        />
        {!!brands.length && (
          <div className="mk-grid mk-align-start">
            <ChannelAccountForm
              connection={connection}
              setConnection={setConnection}
              capabilities={capabilities}
              busy={busy}
              onSubmit={onChannelSubmit}
            />
            <BrandChannelList
              channels={channels}
              busy={busy}
              onDisconnect={onDisconnectChannel}
            />
          </div>
        )}
      </>
    );
  }

  if (tab === "community") {
    return (
      <CommunityView
        channels={channels}
        channelFilter={channelFilter}
        publications={allPublications}
        onDispatch={onDispatch}
        onMetricsModal={onMetricsModal}
        onEditor={onEditor}
        busy={busy}
      />
    );
  }

  if (tab === "insights") {
    return (
      <InsightsView
        channels={channels}
        channelFilter={channelFilter}
        publications={allPublications}
        onMetricsModal={onMetricsModal}
      />
    );
  }

  if (!brands.length) {
    return (
      <section className="panel mk-empty">
        <h2>Bắt đầu với website của bạn</h2>
        <p>Thêm thương hiệu để quản lý bài viết, tài khoản kênh và kết quả riêng.</p>
        <button className="primary" onClick={onStartBrand}>
          Tạo thương hiệu đầu tiên
        </button>
      </section>
    );
  }

  if (tab === "content" || tab === "create") {
    return (
      <CreateIdeasView
        posts={posts}
        brands={brands}
        channels={channels}
        onEditor={onEditor}
        onApprove={onApprove}
        onOpenSchedule={onOpenSchedule}
        busy={busy}
      />
    );
  }

  if (tab === "publications") {
    const activeChan = channels.find((c) => c.id === channelFilter);
    return (
      <section className="panel mk-form buffer-publications-view">
        {publicationView === "list" && (
          <>
            {activeChan && <h2 className="channel-view-heading">{activeChan.name}</h2>}
            <div className="section-title buffer-section-title">
              <div className="publication-status-tabs" aria-label="Lọc trạng thái">
                {[["all", "Tất cả"], ["pending", "Hàng chờ"], ["sent", "Đã đăng"], ["attention", "Cần xử lý"]].map(([k, label]) => (
                  <button key={k} aria-pressed={statusFilter === k} onClick={() => setStatusFilter(k)}>
                    {label}
                    <span>
                      {allPublications.filter((p) =>
                        k === "all" ||
                        (k === "pending"
                          ? ["scheduled", "publishing", "retry_wait"].includes(p.status)
                          : k === "sent"
                            ? ["published", "user_reported_published"].includes(p.status)
                            : ["failed", "unknown", "needs_reauth", "awaiting_manual"].includes(p.status))
                      ).length}
                    </span>
                  </button>
                ))}
              </div>
              <button className="secondary" disabled={busy} onClick={onDispatch}>
                Xử lý bài đến hạn
              </button>
            </div>
            <p className="hint">
              Lịch API được kiểm tra mỗi 5 phút. Bài chờ thủ công cần bạn gửi trên nền tảng. Hiển thị tối đa 200 lượt gần nhất.
            </p>
          </>
        )}
        {publicationView === "calendar" ? (
          <PublishingCalendar
            publications={publications}
            channelFor={channelFor}
            onOpen={onShowDetails}
            onCreate={() => onEditor("new")}
          />
        ) : (
          <PublicationTable
            publications={publications}
            channelFor={channelFor}
            onShowDetails={onShowDetails}
            onConfirmModal={onConfirmModal}
            onNotPostedModal={onNotPostedModal}
            onMetricsModal={onMetricsModal}
            onRetry={onRetry}
            onCancel={onCancel}
            onDispatch={onDispatch}
            setNotice={setNotice}
            setError={setError}
            busy={busy}
          />
        )}
      </section>
    );
  }

  return null;
}
