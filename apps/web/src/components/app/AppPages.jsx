import React from "react";
import { Icon } from "../ui";
import MarketingWorkspace from "../MarketingWorkspace";
import LegalLinks from "../LegalLinks";
import FacebookWorkspace from "../facebook/FacebookWorkspace";
import { useApp } from "./AppContext";
import CampaignList from "./CampaignList";
import OverviewPage from "./OverviewPage";
import DevicesPage from "./DevicesPage";
import ResultsPage from "./ResultsPage";
import SettingsPage from "./SettingsPage";
export default function AppPages() {
  const {
    data,
    page,
    setPage,
    setEditor,
    notice,
    setNotice,
    error,
    setError,
    setShowConnectChannelModal,
    setMarketingData,
    marketingNavigation,
    setCampaignSeed,
    upload,
    device,
    title,
  } = useApp();
  const campaignList = <CampaignList />;
  return (
    <div
      className={`page ${page === "marketing" ? "buffer-marketing-page" : ""}`}
    >
      {page !== "marketing" && (
        <div className="page-heading">
          <div>
            <span className="eyebrow">
              {new Date().toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
            <h1>
              {page === "overview"
                ? `Chào ${data.user.name.split(" ").at(-1)}, cùng bắt đầu nhé.`
                : title}
            </h1>
            <p>
              {page === "overview"
                ? "Chuẩn bị nội dung tốt. Để BotAds theo lịch bạn chọn."
                : page === "campaigns"
                  ? "Mỗi ý tưởng, một chiến dịch có thể theo dõi."
                  : page === "devices"
                    ? "Kết nối máy tính để thực hiện công việc từ website."
                    : page === "results"
                      ? "Theo dõi kết quả thực tế của từng lượt gửi."
                      : page === "facebook"
                        ? "Kết nối máy, tìm nhóm phù hợp, duyệt rồi lên lịch đăng."
                        : "Điều chỉnh giới hạn chung cho tài khoản của bạn."}
            </p>
          </div>
          {["overview", "campaigns"].includes(page) && (
            <button className="primary" onClick={() => setEditor("new")}>
              <Icon name="plus" />
              Tạo chiến dịch Facebook
            </button>
          )}
        </div>
      )}
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
      {page === "marketing" && (
        <MarketingWorkspace
          user={data?.user}
          assets={data.assets}
          onUpload={upload}
          navigation={marketingNavigation}
          onSnapshot={setMarketingData}
          onConnectChannel={() => setShowConnectChannelModal(true)}
        />
      )}
      {page === "overview" && <OverviewPage />}
      {page === "facebook" && (
        <FacebookWorkspace
          device={device}
          campaigns={data.campaigns}
          onDevices={() => setPage("devices")}
          onResults={() => setPage("results")}
          onCompose={(groups) => {
            setCampaignSeed({
              workflowVersion: 2,
              groupIds: groups.map((g) => g.id),
              groupUrls: groups.map((g) => g.url),
              autoDiscover: false,
              autoJoin: false,
            });
            setPage("campaigns");
            setEditor("new");
          }}
        />
      )}
      {page === "campaigns" && campaignList}
      {page === "devices" && <DevicesPage />}
      {page === "results" && <ResultsPage />}
      {page === "settings" && <SettingsPage />}

      <footer className="page-footer">
        BotAds · Nội dung do bạn chọn, tiến độ được ghi nhận.
        <span>
          {page === "marketing"
            ? "Kênh API chạy trên cloud. Facebook dùng ứng dụng Windows."
            : "Máy tính cần online để chạy Facebook."}
        </span>
      </footer>
      <LegalLinks />
    </div>
  );
}
