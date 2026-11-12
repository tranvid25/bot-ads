import React from "react";
import { Icon } from "../ui";
import { useApp } from "./AppContext";
import CampaignList from "./CampaignList";
export default function OverviewPage() {
  const { data, setPage, setEditor, device, online } = useApp();
  const campaignList = <CampaignList />;
  return (
    <>
      <section className="hero">
        <div>
          <span className="hero-tag">
            <span className="dot online" /> TỰ ĐỘNG THEO CÁCH CỦA BẠN
          </span>
          <h2>
            Bài của bạn.
            <br />
            Đến đúng cộng đồng.
          </h2>
          <p>
            Tự soạn hay nhờ Gemini, bạn chọn nội dung.
            <br />
            BotAds giúp thực hiện và ghi lại từng bước.
          </p>
          <button onClick={() => setEditor("new")}>
            Bắt đầu một chiến dịch <Icon name="arrow" size={18} />
          </button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="floating-card content-card">
            <span className="mini-icon">
              <Icon name="campaign" />
            </span>
            <strong>Nội dung đã sẵn sàng</strong>
            <div className="fake-line" />
            <div className="fake-line short" />
            <span className="mini-pill">Bài viết + ảnh</span>
          </div>
          <div className="floating-card schedule-card">
            <span className="mini-icon">
              <Icon name="history" />
            </span>
            <div>
              <small>Lịch của bạn</small>
              <strong>09:00</strong>
            </div>
            <Icon name="check" />
          </div>
          <div className="spark-decoration">✳</div>
        </div>
      </section>
      <section className="stats">
        <div>
          <span>
            Lượt gửi hôm nay
            <Icon name="campaign" />
          </span>
          <strong>
            {data.usage}
            <small>/ {data.settings.dailyLimit}</small>
          </strong>
          <p>Bao gồm bài chờ và chưa xác nhận</p>
        </div>
        <div>
          <span>
            Chiến dịch bật lịch
            <Icon name="history" />
          </span>
          <strong>
            {data.campaigns
              .filter((c) => c.enabled)
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <p>Tự chạy khi thiết bị kết nối</p>
        </div>
        <div>
          <span>
            Thiết bị
            <Icon name="device" />
          </span>
          <strong className="device-stat">
            {online ? "Đang online" : "Chưa kết nối"}
          </strong>
          <p>{device ? device.name : "Cài BotAds để liên kết máy tính"}</p>
        </div>
      </section>
      <div className="section-title">
        <h2>Chiến dịch của bạn</h2>
        <button className="link" onClick={() => setPage("campaigns")}>
          Xem tất cả ↗
        </button>
      </div>
      {campaignList}
    </>
  );
}
