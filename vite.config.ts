import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Caminho relativo para os assets: no GitHub Pages o index.html fica em
  // /void/, então './assets/...' resolve para /void/assets/...; no app
  // nativo (Capacitor) o index.html fica na raiz do WebView e resolve para
  // /assets/... Um base absoluto '/void/' quebraria o app nativo.
  base: './',
})
