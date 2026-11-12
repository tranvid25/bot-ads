const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { publish } = require("../../apps/companion/social/publish.cjs");

const html = (provider) => `<!doctype html><html><body>
<a href="${provider === "threads" ? "/@fixture" : "/fixture/"}" aria-label="Profile">Profile</a>
<button id="create">Create</button><script>
window.clicks=0;
document.getElementById('create').onclick=()=>{
const dialog=document.createElement('div');dialog.setAttribute('role','dialog');document.body.append(dialog);
if(${JSON.stringify(provider)}==='threads') {
dialog.innerHTML='<div contenteditable="true" role="textbox"></div><button id="submit">Post</button>';
document.getElementById('submit').onclick=()=>{window.clicks++;dialog.innerHTML='<a href="/@fixture/post/created" aria-label="View post">View post</a>';};
} else {
dialog.innerHTML='<input type="file"><button id="next">Next</button>';let step=0;
document.getElementById('next').onclick=()=>{if(++step===2){dialog.innerHTML='<div contenteditable="true" role="textbox" aria-label="Write a caption"></div><button id="submit">Share</button>';document.getElementById('submit').onclick=()=>{window.clicks++;dialog.innerHTML='<p>Your post has been shared.</p><a href="/p/created/">View post</a>';};}};
}
};</script></body></html>`;
async function scenario(browser, provider, options = {}) {
  const context = await browser.newContext(),
    page = await context.newPage();
  await page.route("**/*", (route) =>
    route.fulfill({ contentType: "text/html", body: html(provider) }),
  );
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "botads-social-"));
  const image = path.join(dir, "image.png");
  fs.writeFileSync(
    image,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1sAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  let reserves = 0;
  try {
    const result = await publish(
      {
        provider,
        config: {
          actorId: options.actorId || "fixture",
          variant: {
            provider,
            content: "Website https://xaywebsite.com",
            assetId: provider === "instagram" ? "asset" : "",
          },
        },
      },
      {},
      provider === "instagram" ? { path: image, mime: "image/png" } : null,
      async () => {
        reserves++;
        if (options.deny) throw new Error("Canceled by server");
      },
      () => {},
      { open: async () => ({ page, close: async () => {} }) },
    );
    return {
      result,
      reserves,
      clicks: await page.evaluate(() => window.clicks),
    };
  } finally {
    await context.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
module.exports = { scenario };
