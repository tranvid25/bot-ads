import { register as discoveryClaim } from "./helpers/facebook-claim-case.mjs";
import { register as groupLibrary } from "./helpers/facebook-library-case.mjs";
import { register as reviewedCampaign } from "./helpers/facebook-campaign-case.mjs";
import { register as discoveryStop } from "./helpers/facebook-stop-case.mjs";
import { register as groupEvidence } from "./helpers/facebook-evidence-case.mjs";
import { before, after } from "node:test";
import { facebookWorker } from "./helpers/facebook-worker.mjs";

let worker, a, b, task, group;
const accountKey = "a".repeat(64);
const campaign = {
  workflowVersion: 2,
  groupIds: [],
  name: "Website pilot",
  keywords: ["website"],
  mode: "manual",
  posts: [
    {
      id: "p1",
      content: "Website service https://xaywebsite.com",
      selected: true,
    },
  ],
  dailyLimit: 3,
  enabled: false,
};
before(async () => {
  worker = await facebookWorker();
  a = await worker.owner("alice");
  b = await worker.owner("bob");
  Object.assign(env.state, { worker, a, b, task, group });
});
after(async () => {
  await worker.mf.dispose();
});
const call = (path, data, owner = a, method = "POST") =>
  worker.request(path, {
    method,
    data,
    ...(path.startsWith("/device/")
      ? { token: owner.token }
      : { cookie: owner.cookie }),
  });

const env = { state: {}, call, campaign, accountKey };
discoveryClaim(env);
groupLibrary(env);
reviewedCampaign(env);
discoveryStop(env);
groupEvidence(env);
