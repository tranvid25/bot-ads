import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function GoogleAccount() {
  const [data, setData] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = () => api("/auth/google/account").then(setData);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function action(unlink) {
    setBusy(true);
    setError("");
    try {
      if (unlink) {
        await api("/auth/google/account", "DELETE");
        await load();
      } else {
        const result = await api("/auth/google/start", "POST", {
          mode: "link",
        });
        window.location.assign(result.url);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel google-account">
      <h2>Đăng nhập Google</h2>
      {error && (
        <p className="danger" role="alert">
          {error}
        </p>
      )}
      {data && (
        <>
          <p>
            {data.account
              ? `Đã liên kết: ${data.account.email}`
              : "Liên kết Google để đăng nhập vào chính tài khoản BotAds hiện tại của bạn."}
          </p>
          {!data.account ? (
            <button
              className="secondary"
              disabled={busy || !data.available}
              onClick={() => action(false)}
            >
              Liên kết tài khoản Google
            </button>
          ) : (
            <button
              className="secondary"
              disabled={busy || !data.canUnlink}
              onClick={() => action(true)}
            >
              Ngắt liên kết Google
            </button>
          )}
          {!data.available && (
            <small>Chủ hệ thống chưa cấu hình Google OAuth.</small>
          )}
          {data.account && !data.canUnlink && (
            <small>
              Bạn đang dùng tài khoản chỉ đăng nhập bằng Google; giữ liên kết
              này để tiếp tục truy cập.
            </small>
          )}
        </>
      )}
    </section>
  );
}
