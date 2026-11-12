import React from "react";
import { Icon } from "../ui";
import { useApp } from "./AppContext";
import AppPages from "./AppPages";
export default function AppMain() {
  const { meta, page, setPage, setNotice, title } = useApp();
  return (
    <main className="main">
      {page !== "marketing" && (
        <header className="topbar">
          <span>
            Không gian làm việc <span className="slash">/</span>{" "}
            <strong>{title}</strong>
          </span>
          <button
            className="download-link"
            onClick={() => {
              if (meta.downloadAvailable)
                window.location.href = "/api/download";
              else {
                setPage("devices");
                setNotice("Bộ cài chưa được chủ website phát hành.");
              }
            }}
          >
            <Icon name="download" size={17} />
            Tải ứng dụng Windows
          </button>
        </header>
      )}
      <AppPages />
    </main>
  );
}
