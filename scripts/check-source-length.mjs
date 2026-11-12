import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const skipped = new Set([
  "dist",
  "node_modules",
  "user_data",
  "data",
  ".wrangler",
]);
const extensions = new Set([".js", ".jsx", ".mjs", ".cjs", ".css"]);
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(
    entries
      .filter((e) => !skipped.has(e.name))
      .map(async (e) => {
        const name = path.join(directory, e.name);
        return e.isDirectory()
          ? files(name)
          : extensions.has(path.extname(name))
            ? [name]
            : [];
      }),
  );
  return groups.flat();
}
const source = (await Promise.all([files("apps"), files("packages")])).flat();
const violations = [];
for (const file of source) {
  const lines = (await readFile(file, "utf8")).trimEnd().split("\n").length;
  if (lines >= 200)
    violations.push(`${file}: ${lines} lines (must be below 200)`);
}
if (violations.length) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else console.log(`PASS: ${source.length} source files are below 200 lines.`);
