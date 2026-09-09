import { createAuthClient } from "better-auth/react";
import { customSessionClient, inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "backend";
import { BACKEND_URL } from "../config";

// inferAdditionalFields<typeof auth>() types session.user with auth.ts's
// actual additionalFields (role, inheritViewModeFromBrowser, viewMode) --
// without it, those reach the client fine at runtime but session.user's
// static type has no idea they exist. customSessionClient<typeof auth>()
// does the same for auth.ts's customSession plugin -- without it,
// hasAcceptedTermsAndConditions reaches the client fine at runtime (it's
// really there, same class of gap as auth.ts's own customSession callback
// typing -- see that file's comment) but useSession()'s static return type
// has no idea it exists either.
export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
  plugins: [inferAdditionalFields<typeof auth>(), customSessionClient<typeof auth>()],
});
