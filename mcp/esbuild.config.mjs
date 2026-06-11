import { build } from "esbuild";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { cpSync } from "node:fs";
import pkg from "./package.json" with { type: "json" };

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  sourcemap: true,
  external: ["bigint-buffer"],
  define: {
    "process.env._PACKET_MCP_VERSION": JSON.stringify(pkg.version),
  },
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

// The BGW BLS12-381 WASM loader is bundled inline, so its wasm-bindgen nodejs
// glue reads the .wasm relative to __dirname (= dist). Copy the binary there.
const require = createRequire(import.meta.url);
const sdkPkgDir = join(
  dirname(dirname(require.resolve("xpkt-sdk"))),
  "dist/entities/wasm/xpkt-bgw-bls12/pkg",
);
cpSync(join(sdkPkgDir, "xpkt_bgw_bls12_wasm_bg.wasm"), "dist/xpkt_bgw_bls12_wasm_bg.wasm");
console.log("[esbuild] copied BGW WASM binary -> dist/");