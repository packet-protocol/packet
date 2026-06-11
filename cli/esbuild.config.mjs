import { build } from "esbuild";
import pkg from "./package.json" with { type: "json" };
import { cpSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  sourcemap: true,
  external: [
    "bigint-buffer",
    "@irys/upload",
    "@irys/upload-solana",
    "@irys/bundles",
    "starknet",
    "fetch-cookie",
    "tough-cookie",
    "psl",
    "punycode",
    "node:punycode"
  ],
  define: {
    "process.env._PACKET_CLI_VERSION": JSON.stringify(pkg.version),
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

// The BGW BLS12-381 WASM package is loaded at runtime via a relative
// dynamic import ("./pkg/xpkt_bgw_bls12_wasm.js") which esbuild leaves
// untouched. Copy the wasm-pack artifact (CJS loader + .wasm bytes) from the
// SDK into dist/pkg so room/group-messaging commands can load it.
const require = createRequire(import.meta.url);
// resolve("xpkt-sdk") -> <sdk>/dist/index.js; the wasm pkg lives under src/.
const sdkRoot = dirname(dirname(require.resolve("xpkt-sdk")));
const sdkPkgDir = join(
  sdkRoot,
  "dist/entities/wasm/xpkt-bgw-bls12/pkg",
);
mkdirSync("dist/pkg", { recursive: true });
for (const file of [
  "xpkt_bgw_bls12_wasm.js",
  "xpkt_bgw_bls12_wasm_bg.wasm",
  "xpkt_bgw_bls12_wasm.d.ts",
  "xpkt_bgw_bls12_wasm_bg.wasm.d.ts",
  "package.json",
]) {
  cpSync(join(sdkPkgDir, file), join("dist/pkg", file));
}
// esbuild inlines the wasm-bindgen nodejs loader, whose glue reads the .wasm
// relative to the bundle dir (dist), so the binary must also sit flat in dist.
cpSync(join(sdkPkgDir, "xpkt_bgw_bls12_wasm_bg.wasm"), "dist/xpkt_bgw_bls12_wasm_bg.wasm");
console.log("[esbuild] copied BGW WASM package -> dist/pkg + dist/");