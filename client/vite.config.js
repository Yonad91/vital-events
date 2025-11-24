import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress duplicate key warnings
        if (warning.code === 'PLUGIN_WARNING' && warning.message.includes('Duplicate key')) {
          return;
        }
        warn(warning);
      }
    }
  },
  esbuild: {
    logOverride: {
      'this-is-undefined-in-esm': 'silent'
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
