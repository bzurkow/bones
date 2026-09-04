import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Reads the root .env directly instead of needing its own copy of
  // client-safe values like VITE_BACKEND_URL.
  envDir: '..',
  server: {
    // Dev convention as of the marketing-site split: this app is reached at
    // app.localhost, not bare localhost, to mirror the eventual
    // apex-domain (web-static) vs. app.-subdomain (this) production split --
    // Vite's default host allowlist doesn't include it otherwise.
    allowedHosts: ['app.localhost'],
  },
})
