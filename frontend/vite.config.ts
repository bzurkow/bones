import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Reads the root .env directly instead of needing its own copy of
  // client-safe values like VITE_BACKEND_URL.
  envDir: '..',
})
