import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";

// Inlines any emitted CSS asset(s) into the JS chunk as a global the custom
// element reads and injects into its own shadow root (SnapCtrlCard renders
// inside a shadow root, so a document.head <style> would never reach it —
// see SnapCtrlCard.ts's connectedCallback()). Also removes the separate CSS
// asset(s) from the bundle. Keeps the card a single self-contained file a
// user can drop into HA's www/ folder — see
// docs/superpowers/specs/2026-08-21-lovelace-card-design.md.
function inlineCss(): Plugin {
  return {
    name: "inline-css",
    // Must run after Vite's internal CSS-extraction plugin has emitted the
    // CSS asset into the bundle, so there's something here to inline.
    enforce: "post",
    generateBundle(_options, bundle) {
      let css = "";
      for (const fileName of Object.keys(bundle)) {
        const asset = bundle[fileName];
        if (asset.type === "asset" && fileName.endsWith(".css")) {
          css += asset.source;
          delete bundle[fileName];
        }
      }
      if (!css) return;

      const injection = `(function(){window.__SNAP_CTRL_CARD_CSS__=${JSON.stringify(
        css
      )};})();`;

      for (const asset of Object.values(bundle)) {
        if (asset.type === "chunk" && asset.isEntry) {
          asset.code = `${injection}\n${asset.code}`;
        }
      }
    },
  };
}

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
  plugins: [vue(), inlineCss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
