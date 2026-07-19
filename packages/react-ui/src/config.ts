// Single source of truth for the backend's location. Hardcoded to local dev
// for now since there's only one environment to point at -- once real
// deployments exist (dev/staging/prod backends), this needs to become an
// actual build-time env var instead.
export const BACKEND_URL = "http://localhost:3000";
