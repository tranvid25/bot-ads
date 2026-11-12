// Real provider + checksum download test against loopback. Never installs anything.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const assert = require("node:assert/strict");
const yaml = require("js-yaml");
const { NsisUpdater } = require("electron-updater");
const { NodeHttpExecutor } = require("builder-util/out/nodeHttpExecutor.js");
const {
  ElectronHttpExecutor,
} = require("electron-updater/out/electronHttpExecutor.js");
const { updateFeed } = require("../packages/desktop-update.cjs");
const createUpdates = require("../apps/companion/runtime/updater.cjs");
(async () => {
  const output = path.resolve(process.argv[2] || "release/lite");
  const lite = process.argv[3] !== "full";
  const feed = updateFeed("win32", "x64", lite);
  const manifest = fs.readFileSync(
    path.join(output, `${feed.channel}.yml`),
    "utf8",
  );
  const info = yaml.load(manifest);
  const installer = path.join(output, info.files[0].url);
  let corrupt = false;
  const server = http.createServer((request, response) => {
    const name = new URL(request.url, "http://localhost").pathname.slice(1);
    if (name === `${feed.channel}.yml`) {
      const data = yaml.load(manifest);
      if (corrupt) {
        data.files[0].sha512 = Buffer.alloc(64).toString("base64");
        data.sha512 = data.files[0].sha512;
      }
      response.end(yaml.dump(data));
    } else if (name === path.basename(installer)) {
      response.setHeader("Content-Length", fs.statSync(installer).size);
      fs.createReadStream(installer).pipe(response);
    } else {
      response.statusCode = 404;
      response.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "botads-update-download-"),
  );
  try {
    for (const invalid of [false, true]) {
      corrupt = invalid;
      const directory = path.join(root, invalid ? "invalid" : "valid");
      fs.mkdirSync(directory);
      const app = {
        version: "1.0.0",
        name: "BotAdsUpdateTest",
        isPackaged: true,
        appUpdateConfigPath: path.join(
          output,
          "win-unpacked/resources/app-update.yml",
        ),
        userDataPath: directory,
        baseCachePath: directory,
        whenReady: async () => {},
        onQuit() {},
        quit() {
          assert.fail("must not quit or install");
        },
      };
      const updater = new NsisUpdater(null, app);
      const executor = new NodeHttpExecutor();
      executor.download =
        ElectronHttpExecutor.prototype.download.bind(executor);
      updater.httpExecutor = executor;
      updater.disableDifferentialDownload = true;
      updater.quitAndInstall = () =>
        assert.fail("must not execute an installer");
      const ctx = {
        app: { isPackaged: true, getVersion: () => "1.0.0" },
        browserMode: lite ? "system" : "bundled",
        notify() {},
        hasWork: () => false,
      };
      const controller = createUpdates(ctx, {
        updater,
        metadata: { botadsUpdate: feed },
        platform: "win32",
        arch: "x64",
        schedule: false,
      });
      controller.start();
      // Test-only transport override; production never accepts renderer/server URLs.
      updater.setFeedURL({
        ...feed,
        url: `http://127.0.0.1:${server.address().port}/`,
      });
      await controller.check();
      assert.equal(controller.state().phase, invalid ? "error" : "downloaded");
      if (!invalid)
        assert.equal(
          fs.statSync(updater.installerPath).size,
          fs.statSync(installer).size,
        );
      assert.equal(updater.autoInstallOnAppQuit, false);
      controller.stop();
      console.log(
        `PASS: real updater ${invalid ? "rejects incorrect SHA-512" : "checks and downloads the packaged installer"}; nothing installed.`,
      );
    }
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    assert.ok(
      path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep),
    );
    fs.rmSync(root, {
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
