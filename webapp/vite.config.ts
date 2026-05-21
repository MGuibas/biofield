import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // Permite que Firebase Auth use popups en desarrollo
      // "same-origin" bloquea window.closed del popup de Google
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})
