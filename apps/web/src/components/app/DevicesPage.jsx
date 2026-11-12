import React from "react";
import { api } from "../../lib/api";
import { Icon, Empty, date } from "../ui";
import { useApp } from "./AppContext";
export default function DevicesPage() {
  const {
    meta,
    setPage,
    setEditor,
    pair,
    setPair,
    busy,
    action,
    device,
    online,
  } = useApp();
  return (
    <>
      <section className="panel">
        <div className="section-title">
          <h2>Kết nối Facebook Groups trên máy tính</h2>
          <div className="mk-actions">
            <button className="secondary" onClick={() => setPage("campaigns")}>
              Mở chiến dịch Facebook
            </button>
            <button
              className="primary"
              onClick={() => {
                setPage("campaigns");
                setEditor("new");
              }}
            >
              Tạo chiến dịch Facebook
            </button>
          </div>
        </div>
        <p>
          Tạo mã liên kết bên dưới, nhập mã vào app BotAds trên máy tính, rồi
          đăng nhập Facebook trong cửa sổ app mở. Máy phải bật và có mạng để
          nhận lịch đăng.
        </p>
      </section>
      <div className="connect-grid">
        <section className="panel">
          <span className="number">01</span>
          <h2>Cài BotAds trên Windows</h2>
          <p>
            Tải bộ cài, mở và làm theo hướng dẫn. Bạn không cần cài Node.js hay
            mở code.
          </p>
          <button
            className="primary"
            disabled={!meta.downloadAvailable}
            onClick={() => (window.location.href = "/api/download")}
          >
            <Icon name="download" />
            Tải cho Windows
          </button>
          {!meta.downloadAvailable && (
            <small className="block">
              Bộ cài chưa được phát hành trên website này.
            </small>
          )}
        </section>
        <section className="panel">
          <span className="number">02</span>
          <h2>Ghép máy tính của bạn</h2>
          <p>
            Trong ứng dụng, nhập địa chỉ website và mã bên dưới. Mã có hiệu lực
            10 phút, dùng một lần.
          </p>
          <div className="copy-value">{window.location.origin}</div>
          <button
            className="secondary"
            disabled={busy || !!device}
            onClick={() =>
              action(async () =>
                setPair((await api("/pairings", "POST", {})).code),
              )
            }
          >
            Tạo mã liên kết
          </button>
          {pair && (
            <div
              className="pair-code"
              role="status"
              aria-label="Mã liên kết máy tính"
            >
              {pair}
            </div>
          )}
          {device && (
            <p className="hint">
              Đã có máy liên kết. Nếu cần ghép lại, kiểm tra và thu hồi máy cũ ở
              phần “Máy đã liên kết” bên dưới.
            </p>
          )}
        </section>
      </div>
      <section className="panel">
        <div className="section-title">
          <h2>Máy đã liên kết</h2>
          <span className="badge">1 máy / tài khoản</span>
        </div>
        {device ? (
          <div className="device-row">
            <Icon name="device" size={35} />
            <div>
              <h3>{device.name}</h3>
              <p>
                <span className={`dot ${online ? "online" : ""}`} />
                {online ? "Đang kết nối" : "Offline"} · Facebook{" "}
                {device.facebook_ready ? "đã kết nối" : "chưa đăng nhập"}
              </p>
              <small>Lần cuối: {date(device.last_seen)}</small>
            </div>
            <button
              className="secondary danger"
              onClick={() => {
                if (
                  confirm(
                    "Thu hồi liên kết máy này? Các lượt đang chạy sẽ được yêu cầu dừng.",
                  )
                )
                  action(
                    () => api(`/devices/${device.id}`, "DELETE"),
                    "Đã thu hồi thiết bị.",
                  );
              }}
            >
              Thu hồi
            </button>
          </div>
        ) : (
          <Empty
            title="Chưa có thiết bị"
            text="Cài ứng dụng và nhập mã liên kết để máy tính xuất hiện tại đây."
          />
        )}
      </section>
      <div className="notice">
        Sau khi ghép, bấm Kết nối Facebook trong ứng dụng và tự đăng nhập. Máy
        cần bật, có mạng và ứng dụng đang chạy; đóng tab website vẫn tiếp tục
        được.
      </div>
    </>
  );
}
