import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reportCsv,
  trackingUrl,
} from "../packages/contracts/facebook-report.mjs";
test("reports escape spreadsheet formulas, quotes and multiline content", () => {
  const csv = reportCsv([{ title: "=SUM(A1)", error: 'A "quote"\nline' }]);
  assert.ok(csv.includes("'=SUM(A1)"));
  assert.ok(csv.includes('A ""quote""\nline'));
});
test("UTM preserves existing query and restricts protocols and embedded credentials", () => {
  const url = new URL(
    trackingUrl(
      "https://xaywebsite.com/?lang=en#services",
      "Website",
      "group-a",
    ),
  );
  assert.equal(url.searchParams.get("lang"), "en");
  assert.equal(url.searchParams.get("utm_campaign"), "Website");
  assert.equal(url.hash, "#services");
  assert.throws(() => trackingUrl("javascript:alert(1)", "test"));
  assert.throws(() => trackingUrl("https://user:password@example.com", "test"));
});
