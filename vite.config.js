import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// import { VitePWA } from 'vite-plugin-pwa'  ← COMMENTA QUESTA RIGA

export default defineConfig({
  server: {
    host: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    // VitePWA({...})  ← COMMENTA TUTTO IL BLOCCO PWA
  ],
})