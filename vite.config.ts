import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => {
  // Determine base path:
  // 1. Explicit BASE_PATH env var (e.g. "/bifogat/" for GitHub Pages)
  // 2. GITHUB_REPOSITORY (e.g. "nycander/bifogat" -> "/bifogat/")
  // 3. Fallback to "/" for root deployments, AI Studio preview, and local dev
  let basePath = process.env.BASE_PATH;
  if (!basePath && process.env.GITHUB_REPOSITORY) {
    const repo = process.env.GITHUB_REPOSITORY.split("/")[1];
    basePath = `/${repo}/`;
  }
  if (!basePath) {
    basePath = "/";
  }
  if (!basePath.endsWith("/")) {
    basePath = `${basePath}/`;
  }

  return {
    base: basePath,
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: [
          "favicon.ico",
          "favicon-32x32.png",
          "apple-touch-icon.png",
          "apple-touch-icon-v2.png",
          "icon.svg",
          "icon-v2.svg",
          "pwa-192x192.png",
          "pwa-192x192-v2.png",
          "pwa-512x512.png",
          "pwa-512x512-v2.png",
          "pwa-maskable-512x512.png",
          "pwa-maskable-512x512-v2.png",
        ],
        manifest: {
          id: `${basePath}?v=2`,
          name: "Bifogat Biodlingsloggbok",
          short_name: "Bifogat",
          description: "Offline-first beekeeping logbook with Google Sheets synchronization",
          theme_color: "#778873",
          background_color: "#1b211a",
          display: "standalone",
          start_url: basePath,
          scope: basePath,
          icons: [
            {
              src: "pwa-192x192-v2.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "pwa-512x512-v2.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "pwa-maskable-512x512-v2.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          cacheId: "bifogat-v2",
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve("."),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== "true",
      watch: process.env.DISABLE_HMR === "true" ? null : {},
    },
  };
});
