import React from "react";
import { Icon } from "../ui";
import { providers } from "./constants";

export default function MarketingFilters({
  search,
  setSearch,
  channelFilter,
  setChannelFilter,
  channels,
  tab,
  publicationView,
  setPublicationView,
}) {
  return (
    <div className="publishing-filters">
      <div className="mk-actions">
        <label className="search-field">
          <Icon name="search" size={17} />
          <input
            aria-label="Tìm bài viết"
            placeholder="Tìm nội dung…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Lọc theo kênh"
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
        >
          <option value="">Tất cả các kênh</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              {providers[c.provider]} · {c.name}
            </option>
          ))}
        </select>
      </div>
      {tab === "publications" && (
        <div className="segmented-control" aria-label="Kiểu hiển thị lịch">
          <button
            aria-pressed={publicationView === "list"}
            onClick={() => setPublicationView("list")}
          >
            <Icon name="list" size={16} /> Danh sách
          </button>
          <button
            aria-pressed={publicationView === "calendar"}
            onClick={() => setPublicationView("calendar")}
          >
            <Icon name="calendar" size={16} /> Lịch
          </button>
        </div>
      )}
    </div>
  );
}

