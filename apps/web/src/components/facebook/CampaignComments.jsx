import React from "react";
import { Icon } from "../ui";
export default function CampaignComments({ form, set }) {
  return (
    <>
      <div className="soft-panel">
        <label className="check">
          <input
            type="checkbox"
            checked={form.commentEnabled}
            onChange={(e) => set("commentEnabled", e.target.checked)}
          />
          Bình luận kèm link dưới bài đã xác nhận
        </label>
        {form.commentEnabled && (
          <>
            <label>
              Website
              <input
                type="url"
                value={form.commentUrl}
                onChange={(e) => set("commentUrl", e.target.value)}
                placeholder="https://website-cua-ban.com"
              />
            </label>
            <label>
              Nội dung bình luận
              <input
                value={form.commentText}
                onChange={(e) => set("commentText", e.target.value)}
              />
            </label>
          </>
        )}
      </div>
    </>
  );
}
