module.exports = (ctx) => {
  const atom = (file, value) => {
    ctx.fs.mkdirSync(ctx.path.dirname(file), {
      recursive: true,
    });
    const temp = file + ".tmp";
    ctx.fs.writeFileSync(temp, JSON.stringify(value));
    ctx.fs.renameSync(temp, file);
  };
  const read = (file, fallback) => {
    if (!ctx.fs.existsSync(file)) return fallback;
    return JSON.parse(ctx.fs.readFileSync(file, "utf8"));
  };
  function saveCredentials() {
    if (!ctx.safeStorage.isEncryptionAvailable())
      throw new Error("Hệ điều hành chưa cung cấp kho mã hóa an toàn.");
    ctx.fs.writeFileSync(
      ctx.encryptedPath,
      ctx.safeStorage.encryptString(JSON.stringify(ctx.credentials)),
    );
  }
  function dataDir() {
    if (!ctx.credentials.connection) throw new Error("Chưa liên kết website.");
    return ctx.path.join(
      ctx.app.getPath("userData"),
      "accounts",
      ctx.credentials.connection.workspaceId,
    );
  }
  const activeFile = () => ctx.path.join(ctx.dataDir(), "active-job.json");
  function saveCurrent() {
    if (ctx.current) ctx.atom(ctx.activeFile(), ctx.current);
  }
  return { atom, read, saveCredentials, dataDir, activeFile, saveCurrent };
};
