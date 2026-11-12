import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { LEGAL_PATHS, renderLegalPage } from "./pages.mjs";
export function legalPagesPlugin() {
  return {
    name: "botads-public-legal-pages",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const html = renderLegalPage(
          new URL(req.url, "http://localhost").pathname,
        );
        if (!html) return next();
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
      });
    },
    async closeBundle() {
      const directory = fileURLToPath(new URL("../dist/", import.meta.url));
      await mkdir(directory, { recursive: true });
      await Promise.all(
        LEGAL_PATHS.map((route) =>
          writeFile(
            new URL(`../dist/${route.slice(1)}.html`, import.meta.url),
            renderLegalPage(route),
          ),
        ),
      );
    },
  };
}
