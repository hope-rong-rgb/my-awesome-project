import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: [
      'naive-ui',
      'vue',
      'pinia',
      'vue-router',
      'axios'
    ],
    exclude: ['@vicons/ionicons5', 'markdown-it']
  },
  build: {
    outDir:'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          'markdown': ['markdown-it'],
          'icons': ['@vicons/ionicons5'],
          'naive-ui': ['naive-ui'],
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'utils-vendor': ['axios']
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 1100, 
    minify: 'esbuild',
    cssCodeSplit: true,
  },
  root: '.',
  base: './',
})