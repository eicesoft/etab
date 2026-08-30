import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { resolve } from 'path'

export default defineConfig({
  base: '', // 相对路径，兼容 chrome-extension:// 协议
  plugins: [
    vue(),
    viteStaticCopy({
      targets: [
        { src: 'manifest.json', dest: '.' },
        { src: 'src/background/service-worker.js', dest: 'src/background', rename: { stripBase: true } },
      ],
    }),
  ],
  build: {
    outDir: 'dist',
    rolldownOptions: {
      input: {
        popup: resolve(import.meta.dirname, 'src/popup/index.html'),
        tabs: resolve(import.meta.dirname, 'src/tabs/index.html'),
        options: resolve(import.meta.dirname, 'src/options/index.html'),
      },
    },
  },
})