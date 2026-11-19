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
    const ready = !ctx.credentials.facebookAuthInvalid && !!ctx.credentials.auth?.cookies?.some(c => c.name === 'c_user' && c.value);
    const phase = ctx.facebookLogin ? 'connecting' : ctx.current?.finished ? 'syncing'
      : ctx.current || ctx.rechecking || ctx.discovery?.busy() ? 'working'
      : ctx.credentials.facebookPausedByUser ? 'paused' : !ready ? 'login_required' : ctx.stoppedByUser || ctx.credentials.facebookReceiving === false ? 'paused' : 'ready';
    return {
      phase,
      server: ctx.credentials.connection?.server || "",
      browserMode: ctx.browserMode || "bundled",
      update: ctx.updates?.state(),
      linked: !!ctx.credentials.connection && !ctx.credentials.connection.invalid,
      facebookReady: ready,
      socialAccounts: Object.fromEntries(
        Object.entries(ctx.credentials.social || {}).map(
          ([provider, session]) => [
            provider,
            { name: session.identity?.name || "", ready: !!session.auth },
          ],
        ),
      ),
      busy: !!ctx.child || !!ctx.facebookLogin || !!ctx.rechecking,
      facebookLogin: !!ctx.facebookLogin,
      currentJob: ctx.current?.job?.id || null,
      currentCampaign: ctx.current?.job?.campaign?.name || "",
      syncingResults: !!ctx.current?.finished,
      currentSocial: ctx.social?.info(),
      online: !!ctx.credentials.connection && !ctx.credentials.connection.invalid && Date.now() - ctx.lastSeen < 120000,
      error: ctx.error,
      logs: ctx.logs,
      startup: ctx.startup,
      paused: ctx.stoppedByUser,
      receivingEnabled: !!ctx.credentials.connection && ready && !ctx.stoppedByUser && ctx.credentials.facebookReceiving !== false,
    };
  }
  function notify() {
    if (ctx.window && !ctx.window.isDestroyed())
      ctx.window.webContents.send("state", ctx.state());
  }
  return { log, state, notify };
};
