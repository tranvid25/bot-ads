import { test } from "node:test";
import assert from "node:assert/strict";
import { groupCsv } from "../packages/contracts/group-csv.mjs";
test("CSV reads Excel BOM, quoted commas, escaped quotes and multiline names", () => {
  assert.deepEqual(
    groupCsv(
      '\uFEFFurl,name\r\nhttps://www.facebook.com/groups/123,"Website, owners"\r\nhttps://www.facebook.com/groups/456,"A ""quoted""\nname"',
    ),
    [
      { url: "https://www.facebook.com/groups/123", name: "Website, owners" },
      { url: "https://www.facebook.com/groups/456", name: 'A "quoted"\nname' },
    ],
  );
});
test("CSV rejects malformed quoting, empty and excessive input", () => {
  assert.throws(() => groupCsv('url,name\nx,"unfinished'), /chưa đóng/);
  assert.throws(() => groupCsv("url,name"), /500/);
  assert.throws(() => groupCsv("x".repeat(60001)), /60.000/);
});
