// Sourced from the root .env (shared by apps/web and apps/tauri via each
// app's vite.config.ts envDir), not hardcoded -- see VITE_BACKEND_URL.
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
