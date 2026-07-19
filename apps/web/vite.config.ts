import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Shared with apps/tauri so both read the same root .env instead of each
  // needing their own copy of client-safe values like VITE_BACKEND_URL.
  envDir: '../..',
})
