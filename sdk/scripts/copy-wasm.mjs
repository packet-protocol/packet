// Copies the wasm-pack output (pkg/) into dist/ after tsc.
//
// tsc only emits compiled .ts → .js and does not copy non-TS assets, but
// engine.ts does `await import("./pkg/xpkt_bgw_bls12_wasm.js")` at runtime, so
// without this step every published-package consumer fails with
// "BLS12-381 WASM package not found". This keeps the dist pkg in lockstep with
// the source pkg on every build.
import { cp, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const rel = "entities/wasm/xpkt-bgw-bls12/pkg";
const src = join(root, "src", rel);
const dest = join(root, "dist", rel);

try {
    await access(src);
} catch {
    console.error(`[copy-wasm] source pkg not found at ${src} — run "npm run build:bgw-wasm" first`);
    process.exit(1);
}

await cp(src, dest, { recursive: true });
console.log(`[copy-wasm] copied ${rel} → dist/`);
