import React from "react";

export default function GroupFilters({ value, onChange }) {
  return (
    <div className="field-grid">
      {[
        [
          "source",
          "Nguồn nhóm",
          [
            ["import", "Nhập link"],
            ["joined", "Nhóm đã tham gia"],
            ["search", "Tìm theo từ khóa"],
          ],
        ],
        [
          "membership",
          "Quyền tham gia",
          [
            ["joined", "Đã tham gia"],
            ["requested", "Đang chờ"],
            ["not_joined", "Chưa tham gia"],
            ["unknown", "Chưa xác minh"],
          ],
        ],
        [
          "eligibility",
          "Trạng thái duyệt",
          [
            ["approved", "Đã duyệt"],
            ["unreviewed", "Chưa duyệt"],
            ["rejected", "Đã loại"],
          ],
        ],
      ].map(([key, label, options]) => (
        <label key={key}>
          {label}
          <select
            value={value[key] || ""}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          >
            <option value="">Tất cả</option>
            {options.map(([id, name]) => (
              <option value={id} key={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
