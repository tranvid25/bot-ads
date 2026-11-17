import React, { useState } from "react";
import { api } from "../../lib/api";
export default function ContentLibrary({ form, set }) {
  const [items, setItems] = useState([]),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState("");
  async function load() {
    setBusy(true);
    try {
      setItems((await api("/facebook/templates")).templates);
      setNotice("");
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      className="soft-panel"
      onToggle={(e) => {
        if (e.currentTarget.open) load();
      }}
    >
      <summary>Thư viện bài viết dùng lại</summary>
      <p>
        Lưu bài vào thư viện riêng của tài khoản. Dùng lại sẽ tạo bản sao để
        chỉnh sửa, không tự đăng.
      </p>
      <div className="mk-actions">
        <button type="button" disabled={busy} onClick={load}>
          Tải lại thư viện
        </button>
        <button
          type="button"
          disabled={
            busy || !form.posts.some((p) => p.selected && p.content.trim())
          }
          onClick={async () => {
            setBusy(true);
            let saved = 0;
            try {
              for (const post of form.posts.filter(
                (p) => p.selected && p.content.trim(),
              )) {
                await api("/facebook/templates", "POST", {
                  sourceId: post.id,
                  title: post.title || "Bài viết",
                  content: post.content,
                  assetId: post.assetId || "",
                });
                saved++;
              }
              setItems((await api("/facebook/templates")).templates);
              setNotice(`Đã lưu ${saved} bài vào thư viện.`);
            } catch (e) {
              setNotice(`Đã lưu ${saved} bài. ${e.message}`);
            } finally {
              setBusy(false);
            }
          }}
        >
          Lưu các bài đã chọn vào thư viện
        </button>
      </div>
      <input
        aria-label="Tìm trong thư viện bài viết"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Tìm theo tiêu đề hoặc nội dung"
      />
      <p role="status">{notice}</p>
      <div className="approved-group-scroll">
        {items
          .filter((item) =>
            `${item.title} ${item.content}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .map((item) => (
            <article key={item.id} className="post-editor">
              <strong>{item.title}</strong>
              <p>
                {item.content.slice(0, 180)}
                {item.content.length > 180 ? "…" : ""}
              </p>
              <div className="mk-actions">
                <button
                  type="button"
                  disabled={busy || form.posts.length >= 50}
                  onClick={() => {
                    set("posts", [
                      ...form.posts,
                      {
                        id: crypto.randomUUID(),
                        title: item.title,
                        content: item.content,
                        assetId: item.asset_id,
                        selected: true,
                      },
                    ]);
                    setNotice(
                      `Đã thêm bản sao “${item.title}” vào chiến dịch.`,
                    );
                  }}
                >
                  Dùng bài này
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="danger"
                  onClick={async () => {
                    if (
                      !confirm(
                        `Xóa “${item.title}” khỏi thư viện? Bài đã thêm vào chiến dịch được giữ nguyên.`,
                      )
                    )
                      return;
                    setBusy(true);
                    try {
                      await api(`/facebook/templates/${item.id}`, "DELETE");
                      setItems((old) => old.filter((p) => p.id !== item.id));
                      setNotice("Đã xóa khỏi thư viện.");
                    } catch (e) {
                      setNotice(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Xóa khỏi thư viện
                </button>
              </div>
            </article>
          ))}
        {!items.length && !busy && (
          <p>Thư viện chưa có bài. Soạn nội dung rồi lưu các bài đã chọn.</p>
        )}
      </div>
    </details>
  );
}
