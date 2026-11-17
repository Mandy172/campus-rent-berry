// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    plugins: [
      VitePWA({
        strategies: "generateSW",
        filename: "sw.js",
        manifestFilename: "manifest.webmanifest",
        injectRegister: null,
        registerType: "autoUpdate",
        devOptions: { enabled: false },
        manifest: {
          name: "BorrowBee — ADYPU campus rentals",
          short_name: "BorrowBee",
          description: "Borrow and lend within the Ajeenkya DY Patil University community.",
          start_url: "/browse",
          display: "standalone",
          background_color: "#fffdf5",
          theme_color: "#f4cf3d",
          icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        includeAssets: ["favicon.png", "icon-192.png", "icon-512.png", "logo-mark.png", "offline.html", "items/*.jpg"],
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff2,webmanifest}"],
          navigateFallback: "/offline.html",
          navigateFallbackAllowlist: [/^(?!\/api\/)(?!\/~oauth)(?!.*\.[\w]+$).*/],
          navigateFallbackDenylist: [/^\/api\//, /^\/~oauth/],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: { cacheName: "borrowbee-pages", networkTimeoutSeconds: 3, expiration: { maxEntries: 32, maxAgeSeconds: 86400 } },
            },
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: "CacheFirst",
              options: { cacheName: "borrowbee-fonts", expiration: { maxEntries: 20, maxAgeSeconds: 31536000 } },
            },
          ],
        },
      }),
    ],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
