import React from "react";
import { Icon } from "../ui";
import { api } from "../../lib/api";
import { prepareFacebookDevice } from "../../lib/facebook-device";
import { useApp } from "../app/AppContext";
export default function RunFacebookButton({ campaign }) {
  const { data, busy, action, setNotice } = useApp();
  const active = data.jobs.find(
    (j) =>
      j.campaign_id === campaign.id &&
      ["queued", "running", "needs_review"].includes(j.status),
  );
  return (
    <button
      className="primary small"
      disabled={
        busy ||
        !!campaign.blockedReason ||
        (active && active.status !== "queued")
      }
      onClick={() =>
        action(async () => {
          const device = await prepareFacebookDevice();
          if (device.canceled) return;
          await api(`/campaigns/${campaign.id}/run`, "POST", {});
          await device.apply?.();
          setNotice(
            device.message ||
              "Đã gửi chiến dịch tới máy. BotAds tự nhận việc; xem tiến độ trong nhật ký chiến dịch.",
          );
        })
      }
    >
      <Icon name="play" size={16} />
      {active?.status === "queued" ? "Kiểm tra lượt chờ" : "Chạy"}
    </button>
  );
}
