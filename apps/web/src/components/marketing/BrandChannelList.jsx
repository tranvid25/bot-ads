import React from "react";
import { ChannelMark } from "../PublishingViews";
import { providers, manual } from "./constants";

export default function BrandChannelList({ channels, onDisconnect, busy }) {
  return (
    <section className="panel mk-form">
      <h2>Tài khoản của thương hiệu</h2>
      {!channels.length && (
        <p>Chưa thêm tài khoản. Bạn có thể bắt đầu với một kênh thủ công.</p>
      )}
      {channels.map((c) => (
        <div className="mk-channel" key={c.id}>
          <ChannelMark provider={c.provider} />
          <div>
            <strong>{c.name}</strong>
            <small>
              {providers[c.provider]} · {manual.includes(c.provider) ? "Tự đăng" : "API"}
            </small>
            <small>
              {c.status === "connected"
                ? "Đã kết nối"
                : c.status === "needs_reauth"
                  ? "Cần kết nối lại"
                  : "Đã ngắt"}
              {c.expires_at
                ? ` · Hết hạn ${new Date(c.expires_at).toLocaleString("vi-VN")}`
                : ""}
            </small>
          </div>
          {c.status !== "disconnected" && (
            <button
              className="link danger"
              disabled={busy}
              onClick={() => onDisconnect(c.id)}
            >
              Ngắt kết nối
            </button>
          )}
        </div>
      ))}
    </section>
  );
}

