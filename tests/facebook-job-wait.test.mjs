import { test } from "node:test";
import assert from "node:assert/strict";
import { jobWait } from "../packages/contracts/facebook-job-wait.mjs";
test("queued jobs explain missing device, offline, login and blocking work separately", () => {
  const job = { id: "job", status: "queued", created_at: 9000 };
  const online = { last_seen: 9500, facebook_ready: 1 };
  assert.match(jobWait(job, { devices: [] }, 10000).text, /Chờ ghép máy/);
  assert.match(jobWait(job, { devices: [{ last_seen: 0 }] }, 200000).text, /Chờ máy online/);
  assert.match(jobWait(job, { devices: [{ ...online, facebook_ready: 0 }] }, 10000).text, /Facebook cần đăng nhập/);
  assert.match(jobWait(job, { devices: [online], jobs: [{ id: "block", status: "needs_review" }] }, 10000).text, /block.*kiểm tra kết quả/);
  assert.match(jobWait(job, { devices: [online] }, 10000).text, /Máy online/);
  const waiting = jobWait(job, { devices: [online], groupTasks: [{ status: 'running', kind: 'discover', groups_seen: 2, limit: 20 }] }, 10000);
  assert.match(waiting.text, /tìm nhóm.*2\/20/); assert.equal(waiting.target, 'facebook');
  assert.match(jobWait(job, {}, 9000 + 7200000).text, /quá 2 giờ/);
});
