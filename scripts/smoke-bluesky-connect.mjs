import { build } from "esbuild";
import { chromium } from "playwright";
import assert from "node:assert/strict";

// Exercise the real modal with the parent's handled API-error contract. No
// credentials or network calls are used; a failed redirect must be retryable.
const result = await build({
  stdin: { contents: `import React, { useState } from 'react';
    import { createRoot } from 'react-dom/client';
    import Modal from './apps/web/src/components/marketing/ConnectChannelModal.jsx';
    function App() { const [error,setError]=useState('');
      return <Modal isOpen={true} onClose={()=>{}} error={error} onConnectChannel={async()=>{
        window.connectAttempts=(window.connectAttempts||0)+1;
        await Promise.resolve(); setError('Bluesky từ chối callback HTTPS');
      }}/>; }
    createRoot(document.getElementById('root')).render(<App/>);`, resolveDir: process.cwd(), loader: "jsx" },
  bundle: true, format: "iife", platform: "browser", write: false, define: { "process.env.NODE_ENV": '"production"' },
});
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: result.outputFiles[0].text });
  const card = page.getByText("Bluesky", { exact: true });
  await card.click();
  await page.getByRole("alert").filter({ hasText: "Bluesky từ chối callback HTTPS" }).waitFor();
  await card.click();
  assert.equal(await page.evaluate(() => window.connectAttempts), 2);
  assert.deepEqual(errors, []);
  console.log("PASS: failed Bluesky OAuth is shown in the modal and can be retried; no real requests.");
} finally { await browser.close(); }
