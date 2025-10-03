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
      // 注意：不包含 @vicons/ionicons5 和 markdown-it，让它们动态加载
    ],
    exclude: ['@vicons/ionicons5', 'markdown-it']
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          // 更细粒度的代码分割
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
  base: '/',
})