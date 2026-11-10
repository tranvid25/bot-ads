import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { legalPagesPlugin } from "./legal/pages.mjs";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), legalPagesPlugin()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8899",
        changeOrigin: true,
        configure(proxy) {
          proxy.on("proxyReq", (proxyReq, req) => {
            // The dev proxy changes Host; only translate our own frontend Origin.
            // Foreign Origins remain unchanged so the API still rejects CSRF.
            if (
              ["http://127.0.0.1:5173", "http://localhost:5173"].includes(
                req.headers.origin,
              )
            ) {
              proxyReq.setHeader("Origin", "http://127.0.0.1:8899");
            }
          });
        },
      },
    },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
