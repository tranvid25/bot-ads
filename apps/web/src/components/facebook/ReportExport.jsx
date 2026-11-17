import React from "react";
import { reportCsv } from "../../../../../packages/contracts/facebook-report.mjs";
export default function ReportExport({ attempts }) {
  return (
    <div className="mk-actions">
      <button
        disabled={!attempts.length}
        onClick={() => {
          const url = URL.createObjectURL(
            new Blob([reportCsv(attempts)], { type: "text/csv;charset=utf-8" }),
          );
          const link = document.createElement("a");
          link.href = url;
          link.download = `botads-facebook-${new Date().toISOString().slice(0, 10)}.csv`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}
      >
        Xuất báo cáo CSV
      </button>
      <small>
        Xuất {attempts.length} kết quả đã tải, tối đa 100 lượt gần nhất.
      </small>
    </div>
  );
}
