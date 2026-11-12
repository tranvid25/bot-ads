const { _electron } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
(async () => {
  const sourceExecutable = path.resolve(process.argv[2]);
  const expectedMode = process.argv[3];
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "botads-package-ui-"),
  );
  assert.ok(
    path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep),
  );
  const staged = process.argv.includes("--stage");
  const executablePath = staged
    ? path.join(directory, "app", path.basename(sourceExecutable))
    : sourceExecutable;
  if (staged)
    fs.cpSync(path.dirname(sourceExecutable), path.dirname(executablePath), {
      recursive: true,
    });
  const env = {
    ...process.env,
    BOTADS_TEST_HIDDEN: "1",
    BOTADS_DESKTOP_DATA_DIR: directory,
  };
  delete env.ELECTRON_RUN_AS_NODE;
  let application;
  try {
    application = await _electron.launch({
      executablePath,
      env,
      timeout: 45000,
    });
    const window = await application.firstWindow();
    await window.waitForFunction(
      () => document.getElementById("status")?.textContent === "Chưa liên kết",
    );
    const state = await window.evaluate(() => window.botads.command("state"));
    assert.equal(state.browserMode, expectedMode);
    assert.equal(state.linked, false);
    assert.equal(state.facebookReady, false);
    assert.deepEqual(state.socialAccounts, {});
    assert.equal(state.update.version, require("../package.json").version);
    const asar = require("@electron/asar");
    const archive =
      process.platform === "darwin"
        ? path.resolve(path.dirname(sourceExecutable), "../Resources/app.asar")
        : path.join(path.dirname(sourceExecutable), "resources/app.asar");
    const metadata = JSON.parse(
      asar.extractFile(archive, "package.json").toString(),
    );
    assert.equal(state.update.enabled, !!metadata.botadsUpdate);
    await window
      .locator("#app-version")
      .filter({ hasText: state.update.version })
      .waitFor();
    await window.locator("#update-check").waitFor();
    const note = await window.locator("#browser-note").textContent();
    assert.match(
      note,
      expectedMode === "system" ? /Lite.*Edge.*Chrome/ : /đóng kèm/,
    );
    console.log(
      `PASS: packaged ${expectedMode} app boots hidden with isolated empty data and the correct browser guidance.`,
    );
  } finally {
    if (application) await application.close();
    assert.ok(
      path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep),
    );
    fs.rmSync(directory, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
