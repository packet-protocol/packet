import { dts } from "rollup-plugin-dts";

const subpaths = ["types", "crypto", "entities", "utils", "providers"];

export default [
  {
    input: ".types/index.d.ts",
    output: { file: "dist/index.d.ts", format: "es" },
    plugins: [dts()],
  },
];