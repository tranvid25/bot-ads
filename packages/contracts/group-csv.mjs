export function groupCsv(text) {
  if (typeof text !== "string" || text.length > 60000)
    throw new Error("CSV tối đa 60.000 ký tự.");
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i <= text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (ch === "," || ch === "\n" || ch === undefined)) {
      row.push(cell.trim());
      cell = "";
      if (ch !== ",") {
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else if (ch !== "\r" && ch !== undefined) cell += ch;
  }
  if (quoted) throw new Error("CSV có dấu ngoặc kép chưa đóng.");
  if (rows[0]?.[0].replace(/^\uFEFF/, "").toLowerCase() === "url") rows.shift();
  if (!rows.length || rows.length > 500)
    throw new Error("Nhập từ 1 đến 500 nhóm.");
  return rows.map(([url, name]) => ({
    url: url.replace(/^\uFEFF/, ""),
    name: name || url,
  }));
}
