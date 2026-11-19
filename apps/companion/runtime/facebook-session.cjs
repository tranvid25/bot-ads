module.exports = (ctx) =>
  async function closeFacebookSession() {
    const worker = ctx.facebookWorker;
    ctx.facebookWorker = null;
    if (!worker) return;
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        worker.kill();
        resolve();
      }, 3000);
      worker.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
      if (worker.connected) worker.disconnect();
      else {
        clearTimeout(timer);
        resolve();
      }
    });
  };
