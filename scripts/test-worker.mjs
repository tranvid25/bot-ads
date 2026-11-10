import { build } from "esbuild";

// Miniflare does not resolve npm imports. Match Wrangler's ESM bundling before
// executing the actual Worker, including jose's WebCrypto implementation.
export async function testWorker() {
  const result = await build({
    entryPoints: ["apps/api/worker.mjs"],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    write: false,
    logLevel: "silent",
  });
  return { script: result.outputFiles[0].text, modules: true };
}
