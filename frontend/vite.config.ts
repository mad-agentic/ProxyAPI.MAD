import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@docs": path.resolve(__dirname, "../docs"),
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/v0': {
        target: 'http://localhost:8317',
        changeOrigin: true,
      },
      '/v1': {
        target: 'http://localhost:8317',
        changeOrigin: true,
      }
    }
  }
})
