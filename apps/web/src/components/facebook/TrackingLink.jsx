import React, { useState } from "react";
import { trackingUrl } from "../../../../../packages/contracts/facebook-report.mjs";
export default function TrackingLink({ form }) {
  const [url, setUrl] = useState(""),
    [content, setContent] = useState(""),
    [notice, setNotice] = useState("");
  let link = "";
  try {
    link = trackingUrl(url, form.name, content);
  } catch {}
  return (
    <details className="soft-panel">
      <summary>Tạo link đo lượt về website (UTM)</summary>
      <label>
        Website quảng bá
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://xaywebsite.com"
        />
      </label>
      <label>
        Nhãn bài hoặc nhóm (tùy chọn)
        <input value={content} onChange={(e) => setContent(e.target.value)} />
      </label>
      <label>
        Link để chèn vào nội dung
        <input readOnly value={link} />
      </label>
      <button
        type="button"
        disabled={!link}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setNotice("Đã sao chép link. Dán vào bài viết bạn muốn đo.");
          } catch {
            setNotice("Chọn và sao chép link trong ô phía trên.");
          }
        }}
      >
        Sao chép link
      </button>
      <p role="status">{notice}</p>
      <small>
        UTM giúp phân biệt nguồn truy cập trong công cụ analytics của website.
        Không tự thu thập lượt xem hoặc lead Facebook.
      </small>
    </details>
  );
}
