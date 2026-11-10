import { randomBytes } from "node:crypto";
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!account || !token)
  throw new Error("Missing Cloudflare deployment credentials");
const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/workers/scripts/bot-ads-production/secrets`;
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};
async function call(method, body) {
  const response = await fetch(endpoint, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const result = await response.json();
  // Never print a request body, token or provider error payload from the secrets API.
  if (!response.ok || !result.success)
    throw new Error(
      `Cannot ${method} Worker secrets (HTTP ${response.status})`,
    );
  return result.result;
}
const existing = await call("GET");
const googleConfigured = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"].map(
  (name) =>
    Boolean(process.env[name]?.trim() || existing.some((s) => s.name === name)),
);
if (googleConfigured[0] !== googleConfigured[1])
  throw new Error(
    "Configure both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET; no credential values are printed.",
  );
const hasLinkedInId = Boolean(
  process.env.LINKEDIN_CLIENT_ID ||
  existing.some((s) => s.name === "LINKEDIN_CLIENT_ID"),
);
const hasLinkedInSecret = Boolean(
  process.env.LINKEDIN_CLIENT_SECRET ||
  existing.some((s) => s.name === "LINKEDIN_CLIENT_SECRET"),
);
if (hasLinkedInId !== hasLinkedInSecret)
  throw new Error(
    "Configure both LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET; no credential values are printed.",
  );
if (!hasLinkedInId)
  console.log(
    "LinkedIn is not configured yet. Public policy pages and DEV/manual channels can still be deployed.",
  );
if (!existing.some((s) => s.name === "TOKEN_ENCRYPTION_KEY")) {
  const key =
    process.env.TOKEN_ENCRYPTION_KEY || randomBytes(32).toString("base64");
  if (Buffer.from(key, "base64").length !== 32)
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must contain 32 bytes encoded as base64",
    );
  await call("PUT", {
    name: "TOKEN_ENCRYPTION_KEY",
    text: key,
    type: "secret_text",
  });
  console.log(
    "Initialized marketing encryption key; future deployments preserve it.",
  );
} else console.log("Preserved existing marketing encryption key.");
// Google can be configured later; preserve already-uploaded Worker secrets.
for (const name of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]) {
  const value = process.env[name]?.trim();
  if (value) {
    await call("PUT", { name, text: value, type: "secret_text" });
    console.log(`Configured ${name}.`);
  }
}
for (const name of ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"]) {
  if (process.env[name]) {
    await call("PUT", { name, text: process.env[name], type: "secret_text" });
    console.log(`Configured ${name}.`);
  }
}
