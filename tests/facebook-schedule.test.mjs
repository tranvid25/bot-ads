import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scheduleFields,
  onceDue,
} from "../packages/contracts/facebook-schedule.mjs";
import { isDue } from "../packages/contracts/campaign.mjs";
test("once schedules run within a two-hour window using one stable slot", () => {
  const campaign = scheduleFields(
    {
      scheduleType: "once",
      scheduledAt: "2027-01-01T09:00:00+07:00",
      enabled: true,
    },
    0,
  );
  assert.equal(campaign.scheduledAt, "2027-01-01T02:00:00.000Z");
  assert.equal(onceDue(campaign, new Date("2027-01-01T01:59:00Z")), null);
  const slot = isDue(campaign, new Date("2027-01-01T02:00:00Z"));
  assert.equal(slot, isDue(campaign, new Date("2027-01-01T03:59:00Z")));
  assert.equal(isDue(campaign, new Date("2027-01-01T04:00:00Z")), null);
  assert.equal(isDue(campaign, new Date("2027-01-02T02:00:00Z")), null);
});
test("past enabled dates and invalid schedules are rejected; legacy schedules stay weekly", () => {
  assert.throws(
    () =>
      scheduleFields({
        scheduleType: "once",
        enabled: true,
        scheduledAt: "2000-01-01",
      }),
    /tương lai/,
  );
  assert.throws(
    () => scheduleFields({ scheduleType: "once", scheduledAt: "bad" }),
    /tương lai/,
  );
  assert.throws(
    () => scheduleFields({ scheduleType: "invalid" }),
    /không hợp lệ/,
  );
  assert.deepEqual(scheduleFields({}), { scheduleType: "weekly" });
});
