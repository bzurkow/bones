import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "backend";
import { BACKEND_URL } from "../config";

// inferAdditionalFields<typeof auth>() types session.user with auth.ts's
// actual additionalFields (role, inheritViewModeFromBrowser, viewMode) --
// without it, those reach the client fine at runtime but session.user's
// static type has no idea they exist.
export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
  plugins: [inferAdditionalFields<typeof auth>()],
});
