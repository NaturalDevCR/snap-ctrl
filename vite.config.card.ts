import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// Build config for the standalone Home Assistant Lovelace custom card.
// Produces a single self-contained ES module — no Tailwind, no Pinia,
// no router. See docs/superpowers/specs/2026-08-21-lovelace-card-design.md.
export default defineConfig({
  build: {
    outDir: "dist-card",
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL("./src-card/main.ts", import.meta.url)),
      formats: ["es"],
      fileName: () => "snap-ctrl-card.js",
    },
    rollupOptions: {
      output: {
        // Single file, no code-splitting — the card must be a single
        // resource a user can drop into HA's www/ folder.
        inlineDynamicImports: true,
      },
    },
  },
  publicDir: false,
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
