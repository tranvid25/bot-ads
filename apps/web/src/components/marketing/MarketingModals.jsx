import React from "react";
import PostEditor from "./PostEditor";
import BrandModal from "./BrandModal";
import ScheduleModal from "./ScheduleModal";
import ConfirmModal from "./ConfirmModal";
import MetricsModal from "./MetricsModal";
import NotPostedModal from "./NotPostedModal";
import PublicationDetailsModal from "./PublicationDetailsModal";

export default function MarketingModals({
  brandForm,
  setBrandForm,
  onSaveBrand,
  editor,
  setEditor,
  brands,
  brandId,
  assets,
  onUpload,
  onSavePost,
  schedule,
  setSchedule,
  channels,
  onScheduleConfirm,
  confirm,
  setConfirm,
  onConfirmPermalink,
  metrics,
  setMetrics,
  onSaveMetrics,
  notPosted,
  setNotPosted,
  onSaveNotPosted,
  error,
  showPublication,
  setShowPublication,
  channelFor,
  attempts,
  busy,
  onConnectChannel,
  channelFilter,
}) {
  return (
    <>
      {brandForm && (
        <BrandModal
          brandForm={brandForm}
          setBrandForm={setBrandForm}
          onSave={onSaveBrand}
          busy={busy}
        />
      )}
      {editor && (
        <PostEditor
          value={editor === "new" ? null : editor}
          brands={brands}
          brandId={brandId}
          channels={channels}
          assets={assets}
          onUpload={onUpload}
          onClose={() => setEditor(null)}
          onSave={onSavePost}
          onConnectChannel={onConnectChannel}
          channelFilter={channelFilter}
        />
      )}
      {schedule && (
        <ScheduleModal
          key={schedule.id}
          schedule={schedule}
          channels={channels}
          onClose={() => setSchedule(null)}
          onConfirm={onScheduleConfirm}
          busy={busy}
        />
      )}
      {confirm && (
        <ConfirmModal
          confirm={confirm}
          onClose={() => setConfirm(null)}
          onConfirm={onConfirmPermalink}
          busy={busy}
        />
      )}
      {metrics && (
        <MetricsModal
          metrics={metrics}
          setMetrics={setMetrics}
          onSave={onSaveMetrics}
          busy={busy}
        />
      )}
      {notPosted && (
        <NotPostedModal
          notPosted={notPosted}
          setNotPosted={setNotPosted}
          error={error}
          onSave={onSaveNotPosted}
          busy={busy}
        />
      )}
      {showPublication && (
        <PublicationDetailsModal
          showPublication={showPublication}
          setShowPublication={setShowPublication}
          channelFor={channelFor}
          attempts={attempts}
        />
      )}
    </>
  );
}

