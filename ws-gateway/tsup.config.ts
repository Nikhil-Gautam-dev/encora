import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    format: ["esm", "cjs"], // build for both module types
    sourcemap: true,
    clean: true,
    minify: false,
    dts: true, // generate .d.ts files
    splitting: false,
    shims: true,
    watch: process.env.NODE_ENV === "development"
});
