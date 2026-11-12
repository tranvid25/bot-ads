import React, { useState } from "react";
import DesktopConnectionProgress from "./DesktopConnectionProgress";
export default function MetaConnectView({
  selectedChannel,
  brands = [],
  onBack,
  onConnect,
  busy = false,
}) {
  const [brandId, setBrandId] = useState(brands[0]?.id || "");
  if (selectedChannel.key === "facebook")
    return (
      <div className="buffer-connect-inline-form">
        <h3>Facebook Groups qua máy tính</h3>
        <p>
          Mở hướng dẫn để ghép máy, tìm và duyệt nhóm, rồi tạo chiến dịch
          Facebook.
        </p>
        <a href="/?page=facebook" className="confirm-btn">
          Mở hướng dẫn Facebook Groups
        </a>
        <button className="cancel-btn" onClick={onBack}>
          Quay lại
        </button>
      </div>
    );
  return (
    <div className="buffer-connect-inline-form">
      <button
        type="button"
        className="buffer-connect-back-btn"
        onClick={onBack}
      >
        ← Quay lại danh sách kênh
      </button>
      <h3>Kết nối {selectedChannel.name} qua máy tính</h3>
      <ol>
        <li>Cài bản BotAds máy tính mới và liên kết với tài khoản web.</li>
        <li>Bấm yêu cầu kết nối bên dưới, giữ app mở và nhận việc.</li>
        <li>
          Tự đăng nhập trong cửa sổ trình duyệt do app mở. Website không nhận
          mật khẩu.
        </li>
        <li>Chỉ khi đọc được đúng tài khoản, kênh mới hiện “Đã kết nối”.</li>
      </ol>
      <p>
        {selectedChannel.key === "instagram"
          ? "Bản đầu hỗ trợ một ảnh PNG/JPG và caption."
          : "Bản đầu hỗ trợ bài chữ và link."}{" "}
        Máy phải bật và có mạng để thực hiện lịch.
      </p>
      <a href="/api/download" className="secondary">
        Tải BotAds máy tính
      </a>{" "}
      <a href="/?page=devices">Thiết bị & mã liên kết</a>
      <form
        className="connect-fields-form"
        onSubmit={(e) => {
          e.preventDefault();
          onConnect({ provider: selectedChannel.key, brandId });
        }}
      >
        {!!brands.length && (
          <label>
            Thương hiệu
            <select
              aria-label="Thương hiệu"
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
        )}
        <p>
          Khi cần xác minh hoặc hết phiên, bạn hoàn thành trong trình duyệt
          BotAds. Bài chưa rõ kết quả sẽ yêu cầu kiểm tra trước khi đăng lại.
        </p>
        <button type="submit" className="confirm-btn" disabled={busy}>
          {busy
            ? "Đang gửi yêu cầu…"
            : `Mở đăng nhập ${selectedChannel.name} trên máy`}
        </button>
      </form>
      <DesktopConnectionProgress />
    </div>
  );
}
