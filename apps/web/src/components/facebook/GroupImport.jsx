import React, { useState } from "react";
import { groupCsv } from "../../../../../packages/contracts/group-csv.mjs";
export default function GroupImport({ act, busy }) {
  const [csv, setCsv] = useState(""),
    [error, setError] = useState("");
  let count = 0;
  try {
    if (csv) count = groupCsv(csv).length;
  } catch {}
  return (
    <details>
      <summary>Nhập nhiều nhóm từ CSV</summary>
      <p>
        Hai cột url,name. Có thể xuất CSV từ Excel. Nhóm nhập vào chưa được
        duyệt.
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        aria-label="Chọn file CSV nhóm"
        onChange={async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          if (file.size > 60000) {
            setError("File tối đa 60 KB.");
            return;
          }
          setCsv(await file.text());
          setError("");
        }}
      />
      <textarea
        aria-label="CSV nhóm"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={5}
        placeholder={
          "url,name\nhttps://www.facebook.com/groups/example,Tên nhóm"
        }
      />
      <p>{count} dòng nhóm · Tối đa 500 nhóm</p>
      {error && <p role="alert">{error}</p>}
      <button
        disabled={busy || !count}
        onClick={async () => {
          try {
            groupCsv(csv);
            if (await act("groups/import", "POST", { csv })) setCsv("");
          } catch (e) {
            setError(e.message);
          }
        }}
      >
        Nhập nhóm, chưa duyệt
      </button>
    </details>
  );
}
