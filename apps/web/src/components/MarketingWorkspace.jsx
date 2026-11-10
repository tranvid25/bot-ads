import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { utmUrl } from "../../../../packages/contracts/marketing.mjs";
import "../marketing.css";

const providers = {
  linkedin: "LinkedIn",
  dev: "DEV Community",
  medium: "Medium",
  reddit: "Reddit",
  indiehackers: "Indie Hackers",
};
const manual = ["medium", "reddit", "indiehackers"];
const destinations = {
  medium: "https://medium.com/new-story",
  reddit: "https://www.reddit.com/submit",
  indiehackers: "https://www.indiehackers.com/new-post",
};
const states = {
  draft: "Bản nháp",
  approved: "Đã duyệt",
  scheduled: "Đã lên lịch",
  publishing: "Đang gửi",
  published: "API xác nhận đã đăng",
  awaiting_manual: "Cần tự đăng",
  user_reported_published: "Bạn xác nhận đã đăng",
  unknown: "Chưa rõ — cần kiểm tra",
  needs_reauth: "Cần kết nối lại",
  retry_wait: "Chờ thử lại",
  failed: "Lỗi",
  canceled: "Đã hủy",
};
const date = (value) => new Date(value).toLocaleString("vi-VN");
const variant = (provider) => ({
  provider,
  title: "",
  content: "",
  tags: [],
  canonicalUrl: "",
  assetId: "",
  publicImageConsent: false,
});
const emptyBrand = {
  name: "",
  website: "",
  audience: "",
  language: "en",
  ctaUrl: "",
};

function Status({ value }) {
  return (
    <span className={`mk-status mk-${value}`}>{states[value] || value}</span>
  );
}
function Dialog({ title, children, onClose, error }) {
  return (
    <div
      className="mk-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="mk-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="section-title">
          <h2>{title}</h2>
          <button type="button" className="secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        {children}
      </section>
    </div>
  );
}
function PostEditor({
  value,
  brands,
  brandId,
  assets,
  onUpload,
  onClose,
  onSave,
}) {
  const [post, setPost] = useState(
    value
      ? { ...value, brandId: value.brand_id, sourceUrl: value.source_url }
      : { brandId, title: "", sourceUrl: "", variants: [variant("linkedin")] },
  );
  const [active, setActive] = useState(post.variants[0].provider),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false);
  const selected = post.variants.find((v) => v.provider === active);
  const patch = (fields) => setPost((p) => ({ ...p, ...fields }));
  const patchVariant = (fields) =>
    patch({
      variants: post.variants.map((v) =>
        v.provider === active ? { ...v, ...fields } : v,
      ),
    });
  const brand = brands.find((b) => b.id === post.brandId);
  const tracking = (() => {
    try {
      return utmUrl(
        brand?.cta_url || brand?.website,
        active,
        post.title || "marketing",
      );
    } catch {
      return "";
    }
  })();
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave({
        ...post,
        variants: post.variants.map((v) => ({
          ...v,
          tags:
            typeof v.tags === "string"
              ? v.tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
              : v.tags,
        })),
      });
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      title={value ? "Chỉnh bài tự soạn" : "Tạo bài tự soạn"}
      onClose={onClose}
    >
      <form onSubmit={save} className="mk-form">
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        {value && (
          <p className="notice">
            Lưu thay đổi tạo phiên bản cần duyệt lại. Những lượt đã lên lịch vẫn
            giữ nội dung đã duyệt trước đó; hủy chúng nếu muốn thay thế.
          </p>
        )}
        <div className="mk-grid">
          <label>
            Thương hiệu
            <select
              value={post.brandId}
              disabled={!!value}
              onChange={(e) => patch({ brandId: e.target.value })}
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tên nội dung
            <input
              required
              maxLength={200}
              value={post.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </label>
        </div>
        <label>
          URL bài gốc trên website (nếu đã có)
          <input
            type="url"
            placeholder="https://website.com/resources/bai-viet"
            value={post.sourceUrl}
            onChange={(e) => patch({ sourceUrl: e.target.value })}
          />
        </label>
        <fieldset className="mk-fieldset">
          <legend>Bản nội dung theo kênh</legend>
          <div className="mk-checks">
            {Object.entries(providers).map(([key, label]) => (
              <label key={key} className="mk-check">
                <input
                  type="checkbox"
                  checked={post.variants.some((v) => v.provider === key)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      patch({ variants: [...post.variants, variant(key)] });
                      setActive(key);
                    } else if (post.variants.length > 1) {
                      const next = post.variants.filter(
                        (v) => v.provider !== key,
                      );
                      patch({ variants: next });
                      if (active === key) setActive(next[0].provider);
                    }
                  }}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mk-tabs">
          {post.variants.map((v) => (
            <button
              key={v.provider}
              type="button"
              className={active === v.provider ? "primary small" : "secondary"}
              onClick={() => {
                setActive(v.provider);
                setPreview(false);
              }}
            >
              {providers[v.provider]}
            </button>
          ))}
        </div>
        <label>
          Tiêu đề cho {providers[active]}
          <input
            maxLength={200}
            value={selected.title}
            placeholder={post.title || "Dùng tên nội dung nếu để trống"}
            onChange={(e) => patchVariant({ title: e.target.value })}
          />
        </label>
        <label>
          Nội dung{" "}
          {active === "dev" || active === "medium"
            ? "(có thể dùng Markdown)"
            : ""}
          <textarea
            required
            rows={12}
            maxLength={active === "linkedin" ? 3000 : 50000}
            value={selected.content}
            onChange={(e) => patchVariant({ content: e.target.value })}
          />
          <small>
            {selected.content.length}/{active === "linkedin" ? "3000" : "50000"}{" "}
            ký tự. Bài tự soạn được giữ nguyên khi gửi.
          </small>
        </label>
        {active === "dev" && (
          <div className="mk-grid">
            <label>
              Tags DEV (tối đa 4, cách nhau bằng dấu phẩy)
              <input
                value={
                  Array.isArray(selected.tags)
                    ? selected.tags.join(",")
                    : selected.tags
                }
                onChange={(e) => patchVariant({ tags: e.target.value })}
                placeholder="webdev,javascript,ai"
              />
            </label>
            <label>
              Canonical về bài gốc (chỉ khi đăng lại nội dung tương tự)
              <input
                type="url"
                value={selected.canonicalUrl}
                placeholder={post.sourceUrl}
                onChange={(e) => patchVariant({ canonicalUrl: e.target.value })}
              />
            </label>
          </div>
        )}
        <div className="mk-grid">
          <label>
            Ảnh đính kèm
            <select
              value={selected.assetId}
              onChange={(e) =>
                patchVariant({
                  assetId: e.target.value,
                  publicImageConsent: false,
                })
              }
            >
              <option value="">Không có ảnh</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tải ảnh mới
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                setError("");
                try {
                  const result = await onUpload(file);
                  patchVariant({
                    assetId: result.id,
                    publicImageConsent: false,
                  });
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
        </div>
        {!!selected.assetId && (
          <>
            <img
              className="mk-image"
              alt="Ảnh đã chọn"
              src={`/api/assets/${selected.assetId}`}
            />
            {!manual.includes(active) && (
              <label className="mk-check">
                <input
                  type="checkbox"
                  required
                  checked={selected.publicImageConsent}
                  onChange={(e) =>
                    patchVariant({ publicImageConsent: e.target.checked })
                  }
                />
                Tôi cho phép chia sẻ công khai ảnh này khi bài được gửi lên nền
                tảng.
              </label>
            )}
          </>
        )}
        {manual.includes(active) && (
          <p className="notice">
            Kênh này hỗ trợ chuẩn bị nội dung và nhắc lịch. Bạn tự thực hiện
            đăng bài, chọn ảnh và khai báo canonical nếu nền tảng có hỗ trợ.
          </p>
        )}
        <div className="mk-tracking">
          <strong>Link CTA có UTM</strong>
          <small>
            Gợi ý để bạn chèn vào bài khi phù hợp; hệ thống không tự thêm vào
            nội dung hay canonical.
          </small>
          <input readOnly aria-label="Link CTA có UTM" value={tracking} />
        </div>
        <button
          type="button"
          className="link"
          onClick={() => setPreview(!preview)}
        >
          {preview ? "Ẩn bản xem trước" : "Xem trước nội dung"}
        </button>
        {preview && (
          <article className="mk-preview">
            <h3>{selected.title || post.title}</h3>
            <pre>{selected.content}</pre>
            {selected.assetId && (
              <img
                alt="Ảnh bản xem trước"
                src={`/api/assets/${selected.assetId}`}
              />
            )}
          </article>
        )}
        <div className="mk-actions">
          <button className="primary" disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu bản nháp"}
          </button>
          <button type="button" className="secondary" onClick={onClose}>
            Hủy
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export default function MarketingWorkspace({ assets, onUpload }) {
  const [data, setData] = useState(null),
    [brandId, setBrandId] = useState(""),
    [tab, setTab] = useState("content");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [editor, setEditor] = useState(null);
  const [brandForm, setBrandForm] = useState(null),
    [connection, setConnection] = useState({
      provider: "dev",
      apiKey: "",
      name: "",
    });
  const [schedule, setSchedule] = useState(null),
    [selectedChannels, setSelectedChannels] = useState([]),
    [scheduledAt, setScheduledAt] = useState("");
  const [confirm, setConfirm] = useState(null),
    [permalink, setPermalink] = useState(""),
    [metrics, setMetrics] = useState(null),
    [showPublication, setShowPublication] = useState(null),
    [notPosted, setNotPosted] = useState(null);
  async function load() {
    const next = await api("/marketing");
    setData(next);
    setBrandId((current) => current || next.brands[0]?.id || "");
  }
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      if (alive)
        load().catch((e) => {
          if (alive) setError(e.message);
        });
    };
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 15000);
    const params = new URLSearchParams(window.location.search);
    if (params.has("linkedin")) {
      params.get("linkedin") === "connected"
        ? setNotice("Đã kết nối LinkedIn. Bạn có thể duyệt bài và lên lịch.")
        : setError(
            "Kết nối LinkedIn chưa thành công. Kiểm tra quyền app, callback và thử lại.",
          );
      params.delete("linkedin");
      window.history.replaceState(
        null,
        "",
        window.location.pathname +
          (params.size ? `?${params}` : "") +
          window.location.hash,
      );
    }
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  async function action(fn, message) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await load();
      if (message) setNotice(message);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <section className="panel">
        <h2>Marketing đa kênh</h2>
        {error ? (
          <p role="alert" className="danger">
            {error}
          </p>
        ) : (
          <p>Đang tải nội dung…</p>
        )}
        <button
          className="link"
          onClick={() => load().catch((e) => setError(e.message))}
        >
          Tải lại
        </button>
      </section>
    );
  const brands = data.brands,
    channels = data.channels.filter((c) => c.brand_id === brandId),
    posts = data.posts.filter((p) => p.brand_id === brandId);
  const publications = data.publications.filter((p) =>
    channels.some((c) => c.id === p.channel_id),
  );
  const channelFor = (p) => data.channels.find((c) => c.id === p.channel_id);
  const actionable = publications.filter(
    (p) => p.status === "awaiting_manual" || p.status === "unknown",
  );
  return (
    <div className="mk-workspace">
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
      <section className="mk-intro">
        <div>
          <span className="eyebrow">
            NỘI DUNG CỦA BẠN · PHÂN PHỐI CÓ CHỦ ĐÍCH
          </span>
          <h2>Từ một ý tưởng, đến đúng người đọc.</h2>
          <p>
            Soạn bài theo từng kênh, duyệt trước khi đăng và theo dõi kết quả.
            LinkedIn và DEV chạy trên cloud; các kênh còn lại có hướng dẫn đăng
            thủ công.
          </p>
        </div>
        <div className="mk-intro-actions">
          <button
            className="secondary"
            onClick={() => setBrandForm({ ...emptyBrand })}
          >
            Thêm thương hiệu
          </button>
          <button
            className="primary"
            disabled={!brandId}
            onClick={() => setEditor("new")}
          >
            Tạo bài tự soạn
          </button>
        </div>
      </section>
      {!!brands.length && (
        <div className="mk-toolbar">
          <label>
            Thương hiệu
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <a
            href={brands.find((b) => b.id === brandId)?.website}
            target="_blank"
            rel="noreferrer"
          >
            Mở website ↗
          </a>
          <small>
            Giờ hiển thị: {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </small>
        </div>
      )}
      <div className="mk-stats">
        <div>
          <strong>{posts.length}</strong>
          <span>Bài tự soạn</span>
        </div>
        <div>
          <strong>
            {
              publications.filter((p) =>
                ["scheduled", "retry_wait", "publishing"].includes(p.status),
              ).length
            }
          </strong>
          <span>Lượt đang chờ / gửi</span>
        </div>
        <div>
          <strong>
            {publications.filter((p) => p.status === "published").length}
          </strong>
          <span>API xác nhận đã đăng</span>
        </div>
        <div>
          <strong>{actionable.length}</strong>
          <span>Cần bạn thao tác</span>
        </div>
      </div>
      <div className="mk-tabs" role="tablist" aria-label="Marketing">
        <button
          role="tab"
          aria-selected={tab === "content"}
          className={tab === "content" ? "primary small" : "secondary"}
          onClick={() => setTab("content")}
        >
          Kho nội dung
        </button>
        <button
          role="tab"
          aria-selected={tab === "channels"}
          className={tab === "channels" ? "primary small" : "secondary"}
          onClick={() => setTab("channels")}
        >
          Kết nối kênh
        </button>
        <button
          role="tab"
          aria-selected={tab === "publications"}
          className={tab === "publications" ? "primary small" : "secondary"}
          onClick={() => setTab("publications")}
        >
          Lịch & kết quả
        </button>
      </div>
      {tab === "channels" && (
        <section
          className="mk-channel-picker"
          aria-label="Các nền tảng đăng bài"
        >
          <div>
            <h2>Chọn nền tảng của bạn</h2>
            <p>
              LinkedIn và DEV hỗ trợ tự đăng sau khi kết nối. Medium, Reddit và
              Indie Hackers hỗ trợ chuẩn bị bài để bạn đăng thủ công.
            </p>
            {!brands.length && (
              <p className="notice">
                Chọn một nền tảng bên dưới, rồi thêm tên thương hiệu và website
                để lưu tài khoản kết nối đúng thương hiệu.
              </p>
            )}
          </div>
          <div className="mk-channel-cards">
            {Object.entries(providers).map(([key, label]) => (
              <article className="panel mk-channel-card" key={key}>
                <span className="badge">
                  {manual.includes(key)
                    ? "Đăng thủ công"
                    : "Tự động đăng qua API"}
                </span>
                <h3>{label}</h3>
                <p>
                  {key === "linkedin"
                    ? "Đăng nhập LinkedIn và cấp quyền đăng lên tài khoản cá nhân."
                    : key === "dev"
                      ? "Kết nối tài khoản DEV bằng API key của bạn."
                      : "Lưu tên tài khoản để quản lý nội dung; bạn tự đăng bài trên nền tảng."}
                </p>
                <button
                  type="button"
                  className={
                    connection.provider === key ? "primary" : "secondary"
                  }
                  aria-pressed={connection.provider === key}
                  onClick={() => {
                    setConnection({ provider: key, name: "", apiKey: "" });
                    if (!brands.length) setBrandForm({ ...emptyBrand });
                    else
                      requestAnimationFrame(() =>
                        document
                          .getElementById("mk-channel-form")
                          ?.scrollIntoView({ block: "start" }),
                      );
                  }}
                >
                  {manual.includes(key)
                    ? `Thêm kênh ${label}`
                    : `Chọn ${label}`}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
      {!brands.length ? (
        tab !== "channels" && (
          <section className="panel mk-empty">
            <h2>Bắt đầu với website của bạn</h2>
            <p>
              Thêm thương hiệu để quản lý bài viết, tài khoản kênh và kết quả
              riêng.
            </p>
            <button
              className="primary"
              onClick={() => setBrandForm({ ...emptyBrand })}
            >
              Tạo thương hiệu đầu tiên
            </button>
          </section>
        )
      ) : (
        <>
          {tab === "content" && (
            <section className="mk-content-list">
              {!posts.length ? (
                <div className="panel mk-empty">
                  <h2>Bài đầu tiên bắt đầu từ bạn</h2>
                  <p>
                    Nhập nội dung đã chuẩn bị. Mỗi kênh có một bản riêng, không
                    cần API AI.
                  </p>
                  <button className="primary" onClick={() => setEditor("new")}>
                    Soạn bài đầu tiên
                  </button>
                </div>
              ) : (
                posts.map((post) => (
                  <article className="panel mk-post" key={post.id}>
                    <div className="section-title">
                      <div>
                        <h3>{post.title}</h3>
                        <small>
                          Phiên bản {post.revision} · {date(post.updated_at)}
                        </small>
                      </div>
                      <Status value={post.status} />
                    </div>
                    <p className="mk-excerpt">{post.variants[0].content}</p>
                    <div className="mk-provider-tags">
                      {post.variants.map((v) => (
                        <span className="badge" key={v.provider}>
                          {providers[v.provider]}
                        </span>
                      ))}
                    </div>
                    {post.source_url && (
                      <a
                        className="link"
                        href={post.source_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Bài gốc ↗
                      </a>
                    )}
                    <div className="mk-actions">
                      <button
                        className="secondary"
                        onClick={() => setEditor(post)}
                      >
                        Mở & chỉnh sửa
                      </button>
                      {post.status !== "approved" ? (
                        <button
                          className="primary small"
                          disabled={busy}
                          onClick={() =>
                            action(
                              () =>
                                api(
                                  `/marketing/posts/${post.id}/approve`,
                                  "POST",
                                  { revision: post.revision },
                                ),
                              "Đã duyệt phiên bản hiện tại. Bạn có thể lên lịch.",
                            )
                          }
                        >
                          Duyệt nội dung
                        </button>
                      ) : (
                        <button
                          className="primary small"
                          onClick={() => {
                            setSchedule(post);
                            setSelectedChannels([]);
                            setScheduledAt("");
                          }}
                        >
                          Lên lịch đăng
                        </button>
                      )}
                    </div>
                  </article>
                ))
              )}
            </section>
          )}
          {tab === "channels" && (
            <div className="mk-grid mk-align-start">
              <section className="panel mk-form" id="mk-channel-form">
                <h2>Kết nối tài khoản</h2>
                <form
                  className="mk-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const ok = await action(async () => {
                      if (connection.provider === "linkedin") {
                        const result = await api(
                          "/marketing/linkedin/start",
                          "POST",
                          { brandId },
                        );
                        window.location.assign(result.url);
                      } else
                        await api(
                          `/marketing/channels/${connection.provider === "dev" ? "dev" : "manual"}`,
                          "POST",
                          { brandId, ...connection },
                        );
                    }, "Đã thêm tài khoản kênh.");
                    if (ok)
                      setConnection((current) => ({
                        ...current,
                        apiKey: "",
                        name: "",
                      }));
                  }}
                >
                  <label>
                    Nền tảng
                    <select
                      value={connection.provider}
                      onChange={(e) =>
                        setConnection({
                          provider: e.target.value,
                          name: "",
                          apiKey: "",
                        })
                      }
                    >
                      {Object.entries(providers).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                          {manual.includes(key) ? " · thủ công" : " · API"}
                        </option>
                      ))}
                    </select>
                  </label>
                  {connection.provider === "dev" && (
                    <>
                      <label>
                        API key DEV
                        <input
                          type="password"
                          required
                          autoComplete="off"
                          value={connection.apiKey}
                          onChange={(e) =>
                            setConnection({
                              ...connection,
                              apiKey: e.target.value,
                            })
                          }
                        />
                      </label>
                      <small>
                        Tạo key trong{" "}
                        <a
                          href="https://dev.to/settings/extensions"
                          target="_blank"
                          rel="noreferrer"
                        >
                          DEV → Settings → Extensions
                        </a>
                        . Key được kiểm tra và mã hóa trên server.
                      </small>
                      {!data.capabilities.dev && (
                        <p className="notice">
                          Chủ hệ thống cần cấu hình khóa bảo vệ kết nối và
                          PUBLIC_APP_URL trước.
                        </p>
                      )}
                    </>
                  )}
                  {connection.provider === "linkedin" && (
                    <p className="notice">
                      {data.capabilities.linkedin
                        ? "Bạn sẽ sang LinkedIn để cấp quyền đăng cho tài khoản cá nhân. Không nhập mật khẩu LinkedIn vào BotAds."
                        : "LinkedIn chưa được chủ hệ thống cấu hình. Cần Developer App có Share on LinkedIn và Sign In with LinkedIn using OpenID Connect; xem hướng dẫn triển khai."}
                    </p>
                  )}
                  {manual.includes(connection.provider) && (
                    <>
                      <label>
                        Tên tài khoản để dễ nhận biết
                        <input
                          required
                          maxLength={100}
                          value={connection.name}
                          onChange={(e) =>
                            setConnection({
                              ...connection,
                              name: e.target.value,
                            })
                          }
                        />
                      </label>
                      <p className="notice">
                        Đây là tài khoản được ghi nhận để tổ chức công việc.
                        BotAds không nhận mật khẩu, không tự đăng hoặc đọc dữ
                        liệu của kênh này.
                      </p>
                    </>
                  )}
                  <button
                    className="primary"
                    disabled={
                      busy ||
                      (!manual.includes(connection.provider) &&
                        !data.capabilities[connection.provider])
                    }
                  >
                    {connection.provider === "linkedin"
                      ? "Kết nối qua LinkedIn"
                      : "Thêm tài khoản"}
                  </button>
                </form>
              </section>
              <section className="panel mk-form">
                <h2>Tài khoản của thương hiệu</h2>
                {!channels.length && (
                  <p>
                    Chưa thêm tài khoản. Bạn có thể bắt đầu với một kênh thủ
                    công.
                  </p>
                )}
                {channels.map((c) => (
                  <div className="mk-channel" key={c.id}>
                    <div>
                      <strong>{c.name}</strong>
                      <small>
                        {providers[c.provider]} ·{" "}
                        {manual.includes(c.provider) ? "Tự đăng" : "API"}
                      </small>
                      <small>
                        {c.status === "connected"
                          ? "Đã kết nối"
                          : c.status === "needs_reauth"
                            ? "Cần kết nối lại"
                            : "Đã ngắt"}
                        {c.expires_at ? ` · Hết hạn ${date(c.expires_at)}` : ""}
                      </small>
                    </div>
                    {c.status !== "disconnected" && (
                      <button
                        className="link danger"
                        disabled={busy}
                        onClick={() =>
                          action(
                            () => api(`/marketing/channels/${c.id}`, "DELETE"),
                            "Đã ngắt kết nối và hủy các lượt chưa gửi của tài khoản này.",
                          )
                        }
                      >
                        Ngắt kết nối
                      </button>
                    )}
                  </div>
                ))}
              </section>
            </div>
          )}
          {tab === "publications" && (
            <section className="panel mk-form">
              <div className="section-title">
                <h2>Từng lượt đăng</h2>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    action(
                      () => api("/marketing/dispatch", "POST", {}),
                      "Đã yêu cầu xử lý những bài API đến hạn. Kết quả sẽ tự cập nhật.",
                    )
                  }
                >
                  Xử lý bài đến hạn
                </button>
              </div>
              <p className="hint">
                Lịch API được kiểm tra mỗi 5 phút. Bài chờ thủ công cần bạn gửi
                trên nền tảng. Hiển thị tối đa 200 lượt gần nhất.
              </p>
              {!publications.length ? (
                <p>
                  Chưa có lịch đăng. Duyệt một bài trong kho nội dung để bắt
                  đầu.
                </p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Nội dung / kênh</th>
                        <th>Thời gian</th>
                        <th>Kết quả</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {publications.map((p) => {
                        const channel = channelFor(p);
                        return (
                          <tr key={p.id}>
                            <td>
                              <strong>{p.snapshot.postTitle}</strong>
                              <small className="block">
                                {providers[channel?.provider]} · {channel?.name}{" "}
                                · v{p.revision}
                              </small>
                            </td>
                            <td>{date(p.scheduled_at)}</td>
                            <td>
                              <Status value={p.status} />
                              {p.error && (
                                <small className="block danger">
                                  {p.error}
                                </small>
                              )}
                              {p.permalink && (
                                <a
                                  className="block link"
                                  href={p.permalink}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Mở bài ↗
                                </a>
                              )}
                              {p.metric_updated_at && (
                                <small className="block">
                                  Số liệu bạn nhập: {p.visits} lượt về web ·{" "}
                                  {p.leads} lead
                                </small>
                              )}
                            </td>
                            <td>
                              <div className="mk-table-actions">
                                <button
                                  className="link"
                                  onClick={() => setShowPublication(p)}
                                >
                                  Nội dung & nhật ký
                                </button>
                                {p.status === "awaiting_manual" && (
                                  <>
                                    <button
                                      className="link"
                                      onClick={async () => {
                                        try {
                                          await navigator.clipboard.writeText(
                                            `${p.snapshot.title}\n\n${p.snapshot.content}`,
                                          );
                                          setNotice(
                                            "Đã sao chép. Bạn cần tự đăng rồi nhập link xác nhận.",
                                          );
                                        } catch {
                                          setError(
                                            "Không sao chép được. Mở Nội dung & nhật ký để chọn nội dung và sao chép.",
                                          );
                                        }
                                      }}
                                    >
                                      Sao chép bài
                                    </button>
                                    <a
                                      className="link"
                                      target="_blank"
                                      rel="noreferrer"
                                      href={destinations[channel?.provider]}
                                    >
                                      Mở nền tảng ↗
                                    </a>
                                  </>
                                )}
                                {["awaiting_manual", "unknown"].includes(
                                  p.status,
                                ) && (
                                  <button
                                    className="link"
                                    onClick={() => {
                                      setConfirm(p);
                                      setPermalink("");
                                    }}
                                  >
                                    Tôi đã đăng · nhập link
                                  </button>
                                )}
                                {p.status === "unknown" && (
                                  <button
                                    className="link danger"
                                    onClick={() =>
                                      setNotPosted({
                                        id: p.id,
                                        note: "",
                                        checked: false,
                                      })
                                    }
                                  >
                                    ?? ki?m tra: ch?a ??ng
                                  </button>
                                )}
                                {["failed", "needs_reauth"].includes(
                                  p.status,
                                ) && (
                                  <button
                                    className="link"
                                    disabled={
                                      busy || channel?.status !== "connected"
                                    }
                                    onClick={() =>
                                      action(
                                        () =>
                                          api(
                                            `/marketing/publications/${p.id}/retry`,
                                            "POST",
                                            {},
                                          ),
                                        "Đã xếp lại. Bấm xử lý bài đến hạn hoặc chờ lịch tự động.",
                                      )
                                    }
                                  >
                                    Thử lại
                                  </button>
                                )}
                                {[
                                  "published",
                                  "user_reported_published",
                                ].includes(p.status) && (
                                  <button
                                    className="link"
                                    onClick={() =>
                                      setMetrics({
                                        id: p.id,
                                        visits: p.visits || 0,
                                        leads: p.leads || 0,
                                        note: p.metric_note || "",
                                      })
                                    }
                                  >
                                    Nhập số liệu
                                  </button>
                                )}
                                {[
                                  "scheduled",
                                  "retry_wait",
                                  "awaiting_manual",
                                  "publishing",
                                  "needs_reauth",
                                ].includes(p.status) && (
                                  <button
                                    className="link danger"
                                    disabled={busy || p.cancel_requested}
                                    onClick={() =>
                                      action(
                                        () =>
                                          api(
                                            `/marketing/publications/${p.id}/cancel`,
                                            "POST",
                                            {},
                                          ),
                                        "Đã yêu cầu hủy. Bài nền tảng đã nhận không thể thu hồi bằng thao tác này.",
                                      )
                                    }
                                  >
                                    {p.cancel_requested
                                      ? "Đang yêu cầu hủy"
                                      : "Hủy lượt"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}
      <p className="mk-footnote">
        Đăng bài thành công là kết quả phân phối. Thứ hạng tìm kiếm, trích dẫn
        AI và chuyển đổi cần đo riêng; số liệu nhập tay luôn được ghi rõ nguồn.
      </p>
      {brandForm && (
        <Dialog
          title="Thêm thương hiệu / website"
          onClose={() => setBrandForm(null)}
        >
          <form
            className="mk-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await action(async () => {
                const result = await api(
                  "/marketing/brands",
                  "POST",
                  brandForm,
                );
                setBrandId(result.id);
              }, "Đã thêm thương hiệu.");
              if (ok) setBrandForm(null);
            }}
          >
            <label>
              Tên thương hiệu
              <input
                required
                maxLength={100}
                value={brandForm.name}
                onChange={(e) =>
                  setBrandForm({ ...brandForm, name: e.target.value })
                }
              />
            </label>
            <label>
              Website HTTPS
              <input
                required
                type="url"
                value={brandForm.website}
                onChange={(e) =>
                  setBrandForm({ ...brandForm, website: e.target.value })
                }
                placeholder="https://xaywebsite.com"
              />
            </label>
            <label>
              Khách hàng mục tiêu
              <textarea
                maxLength={2000}
                rows={3}
                value={brandForm.audience}
                onChange={(e) =>
                  setBrandForm({ ...brandForm, audience: e.target.value })
                }
              />
            </label>
            <label>
              Ngôn ngữ nội dung
              <input
                maxLength={30}
                value={brandForm.language}
                onChange={(e) =>
                  setBrandForm({ ...brandForm, language: e.target.value })
                }
              />
            </label>
            <label>
              Link CTA / liên hệ (tùy chọn)
              <input
                type="url"
                value={brandForm.ctaUrl}
                onChange={(e) =>
                  setBrandForm({ ...brandForm, ctaUrl: e.target.value })
                }
              />
            </label>
            <button className="primary" disabled={busy}>
              Lưu thương hiệu
            </button>
          </form>
        </Dialog>
      )}
      {editor && (
        <PostEditor
          value={editor === "new" ? null : editor}
          brands={brands}
          brandId={brandId}
          assets={assets}
          onUpload={onUpload}
          onClose={() => setEditor(null)}
          onSave={async (post) => {
            await api(
              `/marketing/posts${editor === "new" ? "" : `/${editor.id}`}`,
              editor === "new" ? "POST" : "PUT",
              post,
            );
            await load();
            setNotice("Đã lưu bản nháp. Xem lại và duyệt trước khi đặt lịch.");
          }}
        />
      )}
      {schedule && (
        <Dialog
          title="Lên lịch cho phiên bản đã duyệt"
          onClose={() => setSchedule(null)}
        >
          <form
            className="mk-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await action(
                () =>
                  api(`/marketing/posts/${schedule.id}/schedule`, "POST", {
                    revision: schedule.revision,
                    channelIds: selectedChannels,
                    scheduledAt: scheduledAt
                      ? new Date(scheduledAt).toISOString()
                      : undefined,
                  }),
                "Đã lưu lịch và giữ nguyên phiên bản đã duyệt.",
              );
              if (ok) {
                setSchedule(null);
                setTab("publications");
              }
            }}
          >
            <h3>
              {schedule.title} · v{schedule.revision}
            </h3>
            <p>
              Chọn tài khoản thuộc thương hiệu và đã có bản nội dung tương ứng.
            </p>
            <div className="mk-form">
              {channels
                .filter(
                  (c) =>
                    c.status === "connected" &&
                    schedule.variants.some((v) => v.provider === c.provider),
                )
                .map((c) => (
                  <label className="mk-check" key={c.id}>
                    <input
                      type="checkbox"
                      checked={selectedChannels.includes(c.id)}
                      onChange={(e) =>
                        setSelectedChannels(
                          e.target.checked
                            ? [...selectedChannels, c.id]
                            : selectedChannels.filter((id) => id !== c.id),
                        )
                      }
                    />
                    {providers[c.provider]} · {c.name}{" "}
                    {manual.includes(c.provider) ? "(cần tự đăng)" : "(API)"}
                  </label>
                ))}
            </div>
            {!channels.some(
              (c) =>
                c.status === "connected" &&
                schedule.variants.some((v) => v.provider === c.provider),
            ) && (
              <p className="notice">
                Chưa có tài khoản phù hợp. Đóng hộp thoại và thêm ở Kết nối
                kênh.
              </p>
            )}
            <label>
              Ngày giờ đăng · {Intl.DateTimeFormat().resolvedOptions().timeZone}
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              <small>
                Để trống để đưa vào lượt kiểm tra lịch tiếp theo. Lịch được lưu
                theo UTC và hiển thị theo múi giờ trình duyệt.
              </small>
            </label>
            <button
              className="primary"
              disabled={busy || !selectedChannels.length}
            >
              Xác nhận lịch đăng
            </button>
          </form>
        </Dialog>
      )}
      {confirm && (
        <Dialog
          title="Xác nhận bằng link bài đã đăng"
          onClose={() => setConfirm(null)}
        >
          <form
            className="mk-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await action(
                () =>
                  api(`/marketing/publications/${confirm.id}/confirm`, "POST", {
                    permalink,
                  }),
                "Đã ghi nhận xác nhận của bạn; đây không phải xác minh tự động từ API.",
              );
              if (ok) setConfirm(null);
            }}
          >
            <p>
              Kiểm tra đúng tài khoản và nội dung trên nền tảng trước khi xác
              nhận. Hệ thống không tự gửi lại bài chưa rõ kết quả.
            </p>
            <label>
              Permalink bài viết
              <input
                required
                type="url"
                value={permalink}
                onChange={(e) => setPermalink(e.target.value)}
              />
            </label>
            <button className="primary" disabled={busy}>
              Ghi nhận tôi đã đăng
            </button>
          </form>
        </Dialog>
      )}
      {metrics && (
        <Dialog
          title="Số liệu do bạn cung cấp"
          onClose={() => setMetrics(null)}
        >
          <form
            className="mk-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await action(
                () =>
                  api(
                    `/marketing/publications/${metrics.id}/metrics`,
                    "POST",
                    metrics,
                  ),
                "Đã lưu số liệu nhập tay.",
              );
              if (ok) setMetrics(null);
            }}
          >
            <p>
              Nhập số liệu từ công cụ analytics/CRM của bạn. BotAds không tự suy
              ra hiệu quả SEO hoặc lượt trích dẫn AI.
            </p>
            <label>
              Lượt về website
              <input
                required
                type="number"
                min={0}
                max={100000000}
                value={metrics.visits}
                onChange={(e) =>
                  setMetrics({ ...metrics, visits: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Lead nhận được
              <input
                required
                type="number"
                min={0}
                max={100000000}
                value={metrics.leads}
                onChange={(e) =>
                  setMetrics({ ...metrics, leads: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Nguồn dữ liệu / kỳ đo
              <textarea
                maxLength={2000}
                rows={3}
                value={metrics.note}
                onChange={(e) =>
                  setMetrics({ ...metrics, note: e.target.value })
                }
              />
            </label>
            <button className="primary" disabled={busy}>
              Lưu số liệu
            </button>
          </form>
        </Dialog>
      )}
      {notPosted && (
        <Dialog
          title="X?c nh?n b?i ch?a ???c ??ng"
          error={error}
          onClose={() => setNotPosted(null)}
        >
          <form
            className="mk-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await action(
                () =>
                  api(
                    `/marketing/publications/${notPosted.id}/not-posted`,
                    "POST",
                    notPosted,
                  ),
                "?? ghi nh?n ki?m tra c?a b?n. B?n c? th? ch? ??ng th? l?i trong danh s?ch.",
              );
              if (ok) setNotPosted(null);
            }}
          >
            <p>
              Ch? d?ng sau khi b?n ki?m tra tr?c ti?p ??ng t?i kho?n tr?n n?n
              t?ng. N?u b?i ?? ???c nh?n ho?c ch?a ch?c ch?n, gi? tr?ng th?i
              ch?a r? ?? tr?nh g?i tr?ng.
            </p>
            <label>
              B?n ?? ki?m tra nh?ng g??
              <textarea
                required
                minLength={10}
                maxLength={1000}
                rows={3}
                value={notPosted.note}
                onChange={(e) =>
                  setNotPosted({ ...notPosted, note: e.target.value })
                }
              />
            </label>
            <label className="mk-check">
              <input
                required
                type="checkbox"
                checked={notPosted.checked}
                onChange={(e) =>
                  setNotPosted({ ...notPosted, checked: e.target.checked })
                }
              />
              T?i ?? ki?m tra tr?c ti?p v? x?c nh?n b?i ch?a ???c ??ng.
            </label>
            <button className="primary" disabled={busy || !notPosted.checked}>
              L?u x?c nh?n, ch?a g?i l?i
            </button>
          </form>
        </Dialog>
      )}
      {showPublication && (
        <Dialog
          title="Nội dung đã duyệt & nhật ký"
          onClose={() => setShowPublication(null)}
        >
          <article className="mk-preview">
            <h3>{showPublication.snapshot.title}</h3>
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
            {data.attempts
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
      )}
    </div>
  );
}
