import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",

  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",

  sourcemap: true,
  external: [
  "bigint-buffer"
],

  banner: {
    js: `#!/usr/bin/env node
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);`
  }
});