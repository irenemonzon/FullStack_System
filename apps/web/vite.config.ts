import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installability only (Add to Home Screen) — no offline write queue,
    // per plan_project.md Sprint 5. manifest.json is hand-authored in
    // public/, so the plugin only needs to register the service worker.
    VitePWA({
      manifest: false,
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // Installability only: precache just the app shell HTML, no offline
      // write queue/asset caching (Workbox requires at least one glob).
      workbox: { globPatterns: ['index.html'] },
    }),
  ],
})
