import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages publishes this project at /cineforge-studio/.
export default defineConfig({
  base: '/cineforge-studio/',
  plugins: [react()],
})
