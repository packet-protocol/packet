// Copies the wasm-pack output into dist/ after tsc.
//
// tsc only emits compiled .ts → .js and does not copy non-TS assets, but
// engine.ts does `await import("./pkg.../xpkt_bgw_bls12_wasm.js")` at runtime, so
// without this step every published-package consumer fails with
// "BLS12-381 WASM package not found". This keeps the dist pkgs in lockstep with
// the source pkgs on every build.
//
// Two builds ship: `pkg` (--target nodejs, for Node) and `pkg-web` (--target
// web, for browser bundlers). engine.ts picks the right one at runtime.
import { cp, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const dirs = [
    { rel: "entities/wasm/xpkt-bgw-bls12/pkg", build: "build:bgw-wasm", required: true },
    { rel: "entities/wasm/xpkt-bgw-bls12/pkg-web", build: "build:bgw-wasm-web", required: false },
];

for (const { rel, build, required } of dirs) {
    const src = join(root, "src", rel);
    const dest = join(root, "dist", rel);
    try {
        await access(src);
    } catch {
        const msg = `[copy-wasm] source not found at ${src} — run "npm run ${build}" first`;
        if (required) {
            console.error(msg);
            process.exit(1);
        }
        console.warn(`${msg} (skipping; browser consumers will fail to load wasm)`);
        continue;
    }
    await cp(src, dest, { recursive: true });
    console.log(`[copy-wasm] copied ${rel} → dist/`);
}
