module.exports = (ctx) => {
  function log(text) {
    ctx.logs.push({
      text: String(text).slice(0, 2000),
      time: Date.now(),
    });
    if (ctx.logs.length > 150) ctx.logs.shift();
    if (ctx.current) {
      ctx.current.events.push({
        id: ctx.crypto.randomUUID(),
        text: String(text).slice(0, 2000),
      });
      ctx.current.events = ctx.current.events.slice(-100);
      ctx.saveCurrent();
    }
    ctx.notify();
  }
  function state() {
    return {
      server: ctx.credentials.connection?.server || "",
      browserMode: ctx.browserMode || "bundled",
      update: ctx.updates?.state(),
      linked: !!ctx.credentials.connection,
      facebookReady: !!ctx.credentials.auth?.cookies?.some(
        (c) => c.name === "c_user",
      ),
      socialAccounts: Object.fromEntries(
        Object.entries(ctx.credentials.social || {}).map(
          ([provider, session]) => [
            provider,
            { name: session.identity?.name || "", ready: !!session.auth },
          ],
        ),
      ),
      busy: !!ctx.child,
      currentJob: ctx.current?.job?.id || null,
      currentSocial: ctx.social?.info(),
      online: Date.now() - ctx.lastSeen < 120000,
      error: ctx.error,
      logs: ctx.logs,
      startup: ctx.startup,
      paused: ctx.stoppedByUser,
    };
  }
  function notify() {
    if (ctx.window && !ctx.window.isDestroyed())
      ctx.window.webContents.send("state", ctx.state());
  }
  return { log, state, notify };
};
