const { test } = require("node:test");
const assert = require("node:assert/strict");
const { macConfig } = require("../scripts/mac-build-config.cjs");

test("Mac variants isolate architecture, output and browser metadata", () => {
  for (const arch of ["arm64", "x64"])
    for (const lite of [true, false]) {
      const config = macConfig({ arch, lite, env: {} });
      assert.equal(
        config.extraMetadata.botadsBrowserMode,
        lite ? "system" : "bundled",
      );
      assert.equal(
        config.directories.output,
        `release/macos/${arch}/${lite ? "lite" : "full"}`,
      );
      assert.deepEqual(
        config.mac.target.map((t) => t.arch),
        [[arch], [arch]],
      );
      assert.equal(config.mac.identity, "-");
      assert.equal(config.mac.notarize, false);
      assert.deepEqual(config.extraResources, []);
    }
});
test("Signed releases fail closed without credentials; never include their values", () => {
  assert.throws(
    () =>
      macConfig({
        arch: "arm64",
        signed: true,
        env: { CSC_LINK: "private-value" },
      }),
    (err) =>
      err.message.includes("CSC_KEY_PASSWORD") &&
      !err.message.includes("private-value"),
  );
  const env = Object.fromEntries(
    [
      "CSC_LINK",
      "CSC_KEY_PASSWORD",
      "APPLE_ID",
      "APPLE_APP_SPECIFIC_PASSWORD",
      "APPLE_TEAM_ID",
    ].map((name) => [name, "private-value"]),
  );
  const config = macConfig({ arch: "x64", signed: true, env });
  assert.equal(config.forceCodeSigning, true);
  assert.equal(config.mac.notarize, true);
  assert.equal(config.mac.hardenedRuntime, true);
  assert.equal("identity" in config.mac, false);
  assert.ok(!JSON.stringify(config).includes("private-value"));
});
test("Unsupported Mac CPUs fail before building", () => {
  assert.throws(() => macConfig({ arch: "ia32" }), /architecture/);
});
