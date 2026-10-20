import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command }) => {
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
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "icon.svg"],
        manifest: {
          id: basePath,
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
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "pwa-maskable-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
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
