import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import { VitePWA } from "vite-plugin-pwa";
import basicSsl from "@vitejs/plugin-basic-ssl";

import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [
    process.env.HTTPS ? basicSsl() : undefined,
    vue(),
    vueDevTools(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      manifest: {
        name: "Snapcast Control",
        short_name: "Snapcast",
        description:
          "Modern web interface for Snapcast multiroom audio control",
        theme_color: "#0f172a",
        // The app defaults to dark mode (settings.ts: theme ref default is
        // "dark") — a white splash background here would flash white
        // before the actual dark UI paints on launch. Matches
        // App.vue's dark:bg-slate-950.
        background_color: "#020617",
        display: "standalone",
        // No orientation lock: the layout is already responsive (grid
        // breakpoints for wider viewports), and a tablet mounted in
        // landscape — a common way to wall-mount a whole-house audio
        // control panel — would otherwise get locked to portrait by the
        // OS once installed as a PWA.
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      path: "path-browserify",
    },
  },
});
