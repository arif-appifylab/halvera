import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // One dev server for the terminal and the browser pane: always http://localhost:5174.
  server: { port: 5174, strictPort: true },
  // Pages load these packages on demand. Pre-bundling them at start stops the dev server from
  // re-optimising (and reloading the page) the first time a page needs one.
  optimizeDeps: {
    include: [
      '@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-link', '@tiptap/extension-placeholder',
      'react-pdf', 'player.js', '@videojs/react', '@videojs/react/video', '@videojs/hlsjs-video',
    ],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
