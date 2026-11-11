import React from "react";
import Dialog from "./Dialog";
import Status from "./Status";
import { ChannelMark } from "../PublishingViews";
import { date, states } from "./constants";

export default function PublicationDetailsModal({
  showPublication,
  setShowPublication,
  channelFor,
  attempts,
}) {
  if (!showPublication) return null;

  const channel = channelFor(showPublication);

  return (
    <Dialog
      title="Nội dung đã duyệt & nhật ký"
      onClose={() => setShowPublication(null)}
    >
      <div className="publication-detail-summary">
        <div className="post-channel-heading">
          <ChannelMark provider={channel?.provider} />
          <strong>{channel?.name}</strong>
          <Status value={showPublication.status} />
        </div>
        <small>
          Lịch đăng: {date(showPublication.scheduled_at)} · Phiên bản{" "}
          {showPublication.revision}
        </small>
        {showPublication.permalink && (
          <a
            className="primary"
            target="_blank"
            rel="noreferrer"
            href={showPublication.permalink}
          >
            Mở bài đã đăng ↗
          </a>
        )}
        {showPublication.error && (
          <p className="danger">{showPublication.error}</p>
        )}
      </div>
      <article className="mk-preview">
        <h3>
          {showPublication.snapshot.title ||
            showPublication.snapshot.postTitle}
        </h3>
        <pre>{showPublication.snapshot.content}</pre>
        {showPublication.snapshot.assetId && (
          <a
            className="link"
            href={`/api/assets/${showPublication.snapshot.assetId}`}
            target="_blank"
            rel="noreferrer"
          >
            Mở ảnh đính kèm ↗
          </a>
        )}
        {showPublication.snapshot.canonicalUrl && (
          <p>Canonical: {showPublication.snapshot.canonicalUrl}</p>
        )}
      </article>
      <p className="hint">
        Phiên bản {showPublication.revision} · duyệt{" "}
        {date(showPublication.snapshot.approvedAt)}
      </p>
      <ul className="mk-events">
        {attempts
          .filter((a) => a.publication_id === showPublication.id)
          .map((a) => (
            <li key={a.id}>
              <small>
                {date(a.created_at)} · {states[a.status] || a.status}
              </small>
              <p>{a.message}</p>
            </li>
          ))}
      </ul>
    </Dialog>
  );
}

