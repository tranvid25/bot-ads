import React from "react";
import { api } from "../../lib/api";
import GoogleAccount from "../GoogleAccount";
import { useApp } from "./AppContext";
export default function SettingsPage() {
  const {
    meta,
    data,
    setPage,
    setEditor,
    busy,
    limit,
    setLimit,
    action,
    device,
  } = useApp();
  return (
    <>
      <section className="panel google-account">
        <h2>Facebook Groups · Ứng dụng máy tính</h2>
        <p>
          {device
            ? `Máy đã liên kết: ${device.name}.`
            : "Bạn đã cài BotAds.exe? Mở màn hình thiết bị để tạo mã và liên kết app với tài khoản này."}
        </p>
        <button className="primary" onClick={() => setPage("devices")}>
          Thiết bị & mã liên kết
        </button>
        <button className="secondary" onClick={() => setPage("facebook")}>
          Hướng dẫn bắt đầu Facebook
        </button>
        <button
          className="secondary"
          onClick={() => {
            setPage("campaigns");
            setEditor("new");
          }}
        >
          Tạo chiến dịch Facebook
        </button>
        <small>
          Địa chỉ nhập trong app: {window.location.origin}. Link website quảng
          bá như xaywebsite.com được đặt trong nội dung bài viết.
        </small>
      </section>
      <GoogleAccount />
      <section className="panel settings-panel">
        <h2>Giới hạn tài khoản</h2>
        <p>
          Giới hạn/ngày cho Facebook và marketing API, tính riêng từng luồng.
          Marketing tính theo múi giờ bên dưới.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            action(
              () =>
                api("/settings", "PUT", {
                  dailyLimit: limit,
                }),
              "Đã lưu giới hạn tài khoản.",
            );
          }}
        >
          <label>
            Tối đa lượt gửi mỗi ngày
            <input
              type="number"
              min="1"
              max={meta.maxDaily}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            />
            <small>
              Bạn có thể chọn 30, 50 hoặc số khác trong khoảng 1–
              {meta.maxDaily}.
            </small>
          </label>
          <label>
            Múi giờ
            <input value={data.settings.timezone} readOnly />
          </label>
          <div className="notice">
            Hạn mức tính cả bài đang gửi, chờ duyệt và chưa xác nhận. Mỗi chiến
            dịch còn có giới hạn riêng.
          </div>
          <button className="primary" disabled={busy}>
            Lưu thay đổi
          </button>
        </form>
      </section>
    </>
  );
}
