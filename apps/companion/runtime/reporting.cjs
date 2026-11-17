module.exports = (ctx) => {
  function reportAttempts(ids) {
    const state = ctx.read(
      ctx.path.join(ctx.dataDir(), "automation_state.json"),
      {
        attempts: [],
      },
    );
    const reservations = ctx.read(
      ctx.path.join(ctx.dataDir(), "reservations.json"),
      [],
    );
    const known = new Set(state.attempts.map((a) => a.id));
    const extra = reservations
      .filter((a) => !known.has(a.id))
      .map((a) => ({
        ...a,
        status: a.status === "failed" ? "failed" : "unknown",
      }));
    // Merge reservations before another job: a lost reply must not cause a second submit.
    if (extra.length && !ctx.child && !ctx.current?.starting) {
      state.attempts.push(...extra);
      state.groups ||= {};
      state.runs ||= [];
      state.version ||= 2;
      ctx.atom(ctx.path.join(ctx.dataDir(), "automation_state.json"), state);
    }
    const attempts = ctx
      .mergeReservations(state, reservations)
      .attempts.filter((a) => a.cloudJobId)
      .filter(a => !ids || ids.includes(a.id));
    return (ids ? attempts : attempts.slice(-200))
      .map((a) => ({
        id: a.id,
        status: a.status,
        title: a.title,
        timestamp: a.timestamp,
        postUrl: a.postUrl,
        error: a.error,
        submittedContent: a.submittedContent,
        reconciledAt: a.reconciledAt,
        reconcileCheckedAt: a.reconcileCheckedAt,
        comment: a.comment
          ? {
              status: a.comment.status,
              error: a.comment.error,
            }
          : null,
      }));
  }
  async function report() {
    if (!ctx.current) return;
    const outgoing = ctx.current.events.slice(-50);
    const payload = {
      jobId: ctx.current.job.id,
      events: outgoing,
      finished: !!ctx.current.finished,
      error: ctx.current.error,
      summary: ctx.current.summary,
    };
    let batch = [], bytes = 0;
    for (const attempt of ctx.reportAttempts()) {
      const size = Buffer.byteLength(JSON.stringify(attempt));
      if (batch.length && bytes + size > 650000) {
        await ctx.request("/report", "POST", { jobId: payload.jobId, attempts: batch, finished: false });
        batch = []; bytes = 0;
      }
      batch.push(attempt); bytes += size;
    }
    await ctx.request("/report", "POST", { ...payload, attempts: batch });
    const sent = new Set(outgoing.map((e) => e.id));
    ctx.current.events = ctx.current.events.filter((e) => !sent.has(e.id));
    if (ctx.current.finished) {
      ctx.fs.unlinkSync(ctx.activeFile());
      ctx.current = null;
    } else ctx.saveCurrent();
  }
  return { reportAttempts, report };
};
