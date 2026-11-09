const project = "botads-web";
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!account || !token) throw new Error("Missing Cloudflare deployment secrets");
const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/pages/projects`;
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};
const existing = await fetch(`${url}/${project}`, { headers });
const existingData = await existing.json();
if (existing.ok && existingData.success) {
  // The health check uses the stable project URL and main must be production.
  if (existingData.result.production_branch !== "main") {
    throw new Error("Pages project botads-web must use main as its production branch");
  }
  console.log(`Pages project ${project} exists`);
} else if (existing.status === 404) {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: project, production_branch: "main" }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(`Cannot create Pages project (HTTP ${response.status}): ${JSON.stringify(data.errors)}`);
  }
  if (data.result.subdomain !== `${project}.pages.dev`) {
    throw new Error(`Unexpected Pages URL: ${data.result.subdomain}; update the deployment health check`);
  }
  console.log(`Created Pages project ${project}`);
} else {
  throw new Error(`Cannot read Pages project (HTTP ${existing.status}): ${JSON.stringify(existingData.errors)}`);
}
