import { createAuthClient } from "better-auth/react";
import { BACKEND_URL } from "./config";
import { getDesktopToken } from "./desktop-token";

export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
  // On apps/web this resolves to undefined and the header is simply omitted
  // (cookie-based sessions handle that case). On apps/tauri, once the
  // desktop OAuth flow completes, this picks up the bearer token instead --
  // see desktop-auth.ts and desktop-token.ts.
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => getDesktopToken(),
    },
  },
});
