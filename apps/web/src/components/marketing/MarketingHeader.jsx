import React from "react";

export default function MarketingHeader({
  userName,
  brandName,
  brandsCount = 1,
  publications = [],
  postsCount = 0,
  pendingCount = 0,
  publishedCount = 0,
  hasChannels = false,
  onConnectChannel,
  onNewPost,
  onAddBrand,
}) {
  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const displayName = (userName && userName.trim()) || (brandName && brandName !== "My organization" ? brandName : "Creator");
  const pendingPosts = publications.filter((p) =>
    ["scheduled", "retry_wait", "publishing"].includes(p.status)
  );

  return (
    <div className="buffer-dashboard-container">
      {/* 1. Buffer Greeting Banner */}
      <section className="buffer-greeting-banner">
        <div className="greeting-text-wrap">
          <span className="greeting-wave">👋</span>
          <div>
            <h1 className="greeting-title">
              Good Afternoon, {displayName}!
            </h1>
            <span className="greeting-date">{todayStr}</span>
          </div>
        </div>
        <div className="greeting-actions-wrap">
          <button type="button" className="greeting-action-icon-btn" title="Yêu thích" aria-label="Yêu thích">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <button type="button" className="greeting-action-icon-btn" title="Cộng đồng" aria-label="Cộng đồng">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </button>
        </div>
      </section>

      {/* 2. Buffer Streak & Metric Score Pills */}
      <div className="buffer-metrics-row">
        <div className="buffer-metric-pill">
          <div className="metric-badge-circle purple"><span>{publishedCount}</span></div>
          <div className="metric-info">
            <span className="metric-name">Week Streak ⓘ</span>
            <small className="metric-desc">
              {publishedCount > 0 ? "Streak hit, well done!" : "0 bài tuần này · Bắt đầu chuỗi"}
            </small>
          </div>
        </div>
        <div className="buffer-metric-pill">
          <div className="metric-badge-circle dark"><span>{postsCount}</span></div>
          <div className="metric-info">
            <span className="metric-name">Posting Goals ⓘ</span>
            <small className="metric-desc">{postsCount > 0 ? `${postsCount} bài sẵn sàng` : "No goals yet · Set goals"}</small>
          </div>
        </div>
        <div className="buffer-metric-pill">
          <div className="metric-badge-circle dark"><span>{pendingCount}</span></div>
          <div className="metric-info">
            <span className="metric-name">Scheduled Posts ⓘ</span>
            <small className="metric-desc">
              {pendingCount > 0 ? `${pendingCount} bài chờ đăng` : "Holding steady"}
            </small>
          </div>
        </div>
      </div>

      {/* 3. Buffer First Steps */}
      <div className="buffer-first-steps-section">
        <h3 className="section-label">First Steps</h3>
        <div className="first-steps-grid">
          <div className="step-card">
            <div className="step-card-header">
              <strong>1. Connect a channel</strong>
              <span className={`step-check ${hasChannels ? "done" : ""}`}>✓</span>
            </div>
            <p>Personalize your profile to make the most out of BotSalesOra.</p>
            <button type="button" className="buffer-step-btn" onClick={onConnectChannel}>
              + Connect Channel
            </button>
          </div>

          <div className="step-card">
            <div className="step-card-header">
              <strong>2. Create a post</strong>
              <span className={`step-check ${postsCount > 0 ? "done" : ""}`}>✓</span>
            </div>
            <p>Schedule your first post in just a few clicks.</p>
            <button type="button" className="buffer-step-btn" onClick={onNewPost}>
              ✏️ Create Post
            </button>
          </div>

          <div className="step-card">
            <div className="step-card-header">
              <strong>3. Part of a team?</strong>
              <span className={`step-check ${brandsCount > 1 ? "done" : ""}`}>✓</span>
            </div>
            <p>Invite your team and try our collaboration features on the team plan.</p>
            <button type="button" className="buffer-step-btn" onClick={onAddBrand}>
              👥 Invite / Thêm Brand
            </button>
          </div>
        </div>
      </div>

      {/* 4. Buffer Up Next & Comments Grid */}
      <div className="buffer-home-bottom-grid">
        <div className="buffer-home-card up-next-card">
          <div className="home-card-header">
            <h4>Up Next · {pendingPosts.length} posts scheduled</h4>
          </div>
          {pendingPosts.length === 0 ? (
            <div className="home-card-empty-content">
              <span className="card-empty-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <p className="card-empty-title">No posts scheduled yet.</p>
              <p className="card-empty-sub">You'll see upcoming posts here.</p>
              <button type="button" className="buffer-card-action-btn" onClick={onNewPost}>
                + Create Post
              </button>
            </div>
          ) : (
            <div className="home-card-posts-list">
              {pendingPosts.slice(0, 3).map((pub) => (
                <div key={pub.id} className="home-up-next-item">
                  <strong>{pub.snapshot?.title || pub.snapshot?.postTitle || "Bài viết đã lên lịch"}</strong>
                  <small>{new Date(pub.scheduled_at).toLocaleString("vi-VN")}</small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="buffer-home-card comments-card">
          <div className="home-card-header">
            <h4>Published · {publishedCount} posts</h4>
          </div>
          <div className="home-card-empty-content">
            <span className="card-empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <p className="card-empty-title">
              {publishedCount > 0 ? `${publishedCount} bài đã xuất bản` : "Chưa có tương tác"}
            </p>
            <p className="card-empty-sub">
              {publishedCount > 0
                ? "Theo dõi phản hồi & phân tích trong tab Community & Insights."
                : "You'll see the latest comments here."}
            </p>
          </div>
        </div>
      </div>

      {/* 5. Floating Help Button */}
      <button type="button" className="buffer-floating-help-btn" aria-label="Trợ giúp" title="Trợ giúp">
        ?
      </button>
    </div>
  );
}
