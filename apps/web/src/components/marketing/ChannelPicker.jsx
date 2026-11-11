import React from "react";
import { ChannelMark } from "../PublishingViews";
import { onboardingProviders, manual } from "./constants";

export default function ChannelPicker({
  brands,
  connection,
  setConnection,
  onStartBrand,
}) {
  return (
    <section className="mk-channel-picker buffer-channel-picker-modal" aria-label="Các nền tảng đăng bài">
      <div className="buffer-picker-header">
        <div className="picker-header-badge">
          <span>⚡ Mạng xã hội</span>
        </div>
        <h2>Connect a channel · Chọn nền tảng</h2>
        <p>
          Personalize your profile to make the most out of Buffer. Chọn kênh để bắt đầu lên lịch và phân phối nội dung tự động.
        </p>
        {!brands.length && (
          <div className="notice buffer-picker-notice">
            ℹ️ Chọn một nền tảng bên dưới, sau đó nhập tên thương hiệu để liên kết tài khoản.
          </div>
        )}
      </div>

      <div className="mk-channel-cards buffer-channel-cards-grid">
        {Object.entries(onboardingProviders).map(([key, label]) => (
          <article className={`panel mk-channel-card buffer-channel-card ${connection.provider === key ? "is-selected" : ""}`} key={key}>
            <div className="channel-card-top">
              <ChannelMark provider={key} size="large" />
              <span className={`badge ${manual.includes(key) ? "badge-manual" : "badge-api"}`}>
                {manual.includes(key) ? "Thủ công" : "Tự động API"}
              </span>
            </div>
            <h3>{label}</h3>
            <p>
              {key === "linkedin"
                ? "Kết nối tài khoản LinkedIn cá nhân hoặc trang công ty qua OAuth."
                : key === "dev"
                  ? "Xuất bản bài viết kỹ thuật trực tiếp lên DEV Community qua API Key."
                  : "Soạn thảo, quản lý lịch và lưu bài viết để đăng thủ công nhanh chóng."}
            </p>
            <button
              type="button"
              className={connection.provider === key ? "primary" : "secondary"}
              aria-pressed={connection.provider === key}
              onClick={() => {
                setConnection({ provider: key, name: "", apiKey: "" });
                if (!brands.length) onStartBrand();
                else {
                  requestAnimationFrame(() =>
                    document.getElementById("mk-channel-form")?.scrollIntoView({ block: "start", behavior: "smooth" }),
                  );
                }
              }}
            >
              {manual.includes(key) ? `Thêm kênh ${label}` : `Chọn ${label}`}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
