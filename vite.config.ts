import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cssInjectedByJsPlugin()

  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ChatWidget',
      fileName: 'chat-widget',
      formats: ['umd']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    },
    cssCodeSplit: false,
    minify: 'esbuild'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  }
})
