const file = (ctx) =>
  ctx.path.join(ctx.app.getPath("userData"), "connection-diagnostics.json");
function record(ctx, data) {
  try {
    let entries = [];
    try {
      entries = JSON.parse(ctx.fs.readFileSync(file(ctx), "utf8"));
    } catch {}
    if (!Array.isArray(entries)) entries = [];
    entries.push({
      time: new Date().toISOString(),
      event: data.event,
      origin: data.origin,
      status: data.status,
      version: ctx.app.getVersion(),
    });
    ctx.fs.mkdirSync(ctx.path.dirname(file(ctx)), { recursive: true });
    ctx.fs.writeFileSync(
      file(ctx),
      JSON.stringify(entries.slice(-100), null, 2),
    );
  } catch {
    /* Diagnostics must not interrupt pairing. */
  }
}
module.exports = { file, record };
