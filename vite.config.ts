import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    global: 'globalThis',
  },
  server: {
    host: true, // allow external access
    port: 5173,
    allowedHosts: [
      'unalimentary-emilie-flamboyantly.ngrok-free.dev',
      'all'
    ],
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:8080',
    //     changeOrigin: true,
    //   },
    //   '/oauth2': {
    //     target: 'http://localhost:8080',
    //     changeOrigin: true,
    //   },
    //   '/chat': {
    //     target: 'http://localhost:8080',
    //     changeOrigin: true,
    //     ws: true,
    //   },

    proxy: {
      '/api': {
        target: 'http:32.236.3.182:8080/',
        changeOrigin: true,
      },
      '/oauth2': {
        target: 'http:32.236.3.182:8080/',
        changeOrigin: true,
      },
      '/chat': {
        target: 'http:32.236.3.182:8080/',
        changeOrigin: true,
        ws: true,
      },

  },
  },

})