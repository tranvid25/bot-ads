import React from "react";
import ApprovedGroupSelector from "./ApprovedGroupSelector";

export default function CampaignAudience({ form, set }) {
  return (
    <>
      <p className="notice">
        Bước 2/3: chọn nhóm bạn đã kiểm tra. Tìm nhóm chạy riêng trong Facebook
        Groups, không tự gửi bài trong lúc tìm.
      </p>
      <label>
        Từ khóa chủ đề, mỗi dòng một từ khóa
        <textarea
          rows={3}
          value={form.keywords.join("\n")}
          onChange={(e) => set("keywords", e.target.value.split("\n"))}
          placeholder={"thiết kế website\ncần làm website"}
        />
      </label>
      <label>
        Từ khóa loại trừ
        <textarea
          rows={2}
          value={form.excludedKeywords.join("\n")}
          onChange={(e) => set("excludedKeywords", e.target.value.split("\n"))}
        />
      </label>
      <ApprovedGroupSelector form={form} set={set} />
    </>
  );
}
