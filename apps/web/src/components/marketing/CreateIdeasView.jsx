import React, { useState, useEffect } from "react";
import IdeaBoardColumn from "./IdeaBoardColumn";
import { api } from "../../lib/api";

export default function CreateIdeasView({
  posts = [],
  brands = [],
  onEditor,
  onApprove,
  onOpenSchedule,
  busy,
}) {
  const [ideas, setIdeas] = useState(() => {
    try {
      const raw = localStorage.getItem("botads_marketing_ideas");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("botads_marketing_ideas", JSON.stringify(ideas));
    } catch {}
  }, [ideas]);

  const [activeTab, setActiveTab] = useState("ideas");
  const [activeView, setActiveView] = useState("board");
  const [tagFilter, setTagFilter] = useState("all");
  const [customGroups, setCustomGroups] = useState([]);

  const handleAddIdea = (col = "unassigned") => {
    const title = window.prompt("Nhập tiêu đề ý tưởng mới:")?.trim();
    if (!title) return;
    const desc = window.prompt("Ghi chú chi tiết cho ý tưởng (tùy chọn):")?.trim() || "";
    setIdeas((prev) => [
      ...prev,
      {
        id: `idea-${Date.now()}`,
        column: col,
        title,
        desc,
        tag: "Draft",
        banner: false,
      },
    ]);
  };

  const handleGenerateAI = async () => {
    const promptText = window.prompt("Nhập chủ đề bạn muốn tạo ý tưởng:")?.trim();
    if (!promptText) return;
    try {
      const res = await api("/campaigns/generate", "POST", { prompt: promptText, count: 2 });
      if (res.posts?.length) {
        const generated = res.posts.map((p, idx) => ({
          id: `ai-${Date.now()}-${idx}`,
          column: "unassigned",
          title: p.title || p.heading || promptText,
          desc: p.content || p.body || "",
          tag: "AI Gen",
        }));
        setIdeas((prev) => [...prev, ...generated]);
        return;
      }
    } catch {
      setIdeas((prev) => [
        ...prev,
        {
          id: `idea-${Date.now()}`,
          column: "unassigned",
          title: promptText,
          desc: "Ý tưởng nội dung dựa trên chủ đề bạn yêu cầu.",
          tag: "Draft",
        },
      ]);
    }
  };

  const handleMoveIdea = (id, targetCol) => {
    setIdeas((prev) => prev.map((item) => (item.id === id ? { ...item, column: targetCol } : item)));
  };

  const handleAddGroup = () => {
    const name = window.prompt("Tên nhóm ý tưởng mới (Ví dụ: Backlog, Case Studies):")?.trim();
    if (name) setCustomGroups((prev) => [...prev, { key: `group-${Date.now()}`, title: name }]);
  };

  const columns = [
    { key: "unassigned", title: "Unassigned" },
    { key: "todo", title: "To Do" },
    { key: "in_progress", title: "In Progress" },
    { key: "done", title: "Done" },
    ...customGroups,
  ];

  const filteredIdeas = ideas.filter((i) => tagFilter === "all" || i.tag === tagFilter);

  return (
    <section className="buffer-create-workspace">
      <header className="buffer-create-topbar">
        <div className="create-topbar-left">
          <span className="create-title-icon">💡</span>
          <h2 className="create-main-title">Create</h2>
          <button type="button" className="create-bookmark-btn" title="Đánh dấu trang">🔖</button>
        </div>
        <div className="create-topbar-right">
          <button type="button" className="create-feedback-icon" title="Gửi phản hồi">♡</button>
          <button type="button" className="buffer-ai-gen-btn" onClick={handleGenerateAI}>
            <span>🪄</span> Generate Ideas
          </button>
          <button type="button" className="buffer-new-idea-pill" onClick={() => handleAddIdea("unassigned")}>
            + New Idea
          </button>
        </div>
      </header>

      <div className="buffer-create-subnav">
        <div className="create-subnav-tabs">
          <button type="button" className={`subnav-tab ${activeTab === "ideas" ? "active" : ""}`} onClick={() => setActiveTab("ideas")}>
            Ideas
          </button>
          <button type="button" className={`subnav-tab ${activeTab === "templates" ? "active" : ""}`} onClick={() => setActiveTab("templates")}>
            Templates
          </button>
          <button type="button" className={`subnav-tab ${activeTab === "feeds" ? "active" : ""}`} onClick={() => setActiveTab("feeds")}>
            Feeds
          </button>
        </div>

        <div className="create-subnav-controls">
          <div className="create-tags-filter">
            <span className="tags-icon">🏷️</span>
            <select aria-label="Lọc thẻ" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="tags-select">
              <option value="all">Tags ⌄</option>
              <option value="Draft">#Draft</option>
              <option value="AI Gen">#AI Gen</option>
              <option value="Planning">#Planning</option>
            </select>
          </div>
          <div className="create-view-toggle">
            <button type="button" className={`view-btn ${activeView === "board" ? "active" : ""}`} onClick={() => setActiveView("board")}>
              <span>☷</span> Board
            </button>
            <button type="button" className={`view-btn ${activeView === "gallery" ? "active" : ""}`} onClick={() => setActiveView("gallery")}>
              <span>⊞</span> Gallery
            </button>
          </div>
        </div>
      </div>

      {activeTab === "ideas" && (
        <div className={`buffer-kanban-board-canvas ${activeView === "gallery" ? "is-gallery" : ""}`}>
          {columns.map((col) => (
            <IdeaBoardColumn
              key={col.key}
              columnKey={col.key}
              title={col.title}
              ideas={filteredIdeas.filter((i) => i.column === col.key)}
              posts={col.key === "in_progress" ? posts.filter((p) => p.status !== "approved") : col.key === "done" ? posts.filter((p) => p.status === "approved") : []}
              brands={brands}
              onNewIdea={handleAddIdea}
              onEditor={onEditor}
              onApprove={onApprove}
              onOpenSchedule={onOpenSchedule}
              onMoveIdea={handleMoveIdea}
              busy={busy}
            />
          ))}
          <button type="button" className="buffer-kanban-add-group-btn" onClick={handleAddGroup}>
            + New Group
          </button>
        </div>
      )}

      {activeTab === "templates" && (
        <div className="buffer-templates-canvas">
          <div className="template-card"><h4>📣 Feature Announcement</h4><p>Hook, core benefit, screenshot callout, CTA link with tracking.</p></div>
          <div className="template-card"><h4>💡 Industry Tips / How-to</h4><p>Problem statement, step-by-step resolution, summary takeaway.</p></div>
        </div>
      )}

      {activeTab === "feeds" && (
        <div className="buffer-feeds-canvas">
          <p>No RSS feeds connected yet. Add feeds to automatically ingest content inspirations.</p>
        </div>
      )}
    </section>
  );
}
