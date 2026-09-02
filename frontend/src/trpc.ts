import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "backend";
import { BACKEND_URL } from "./config";

// Shared client for anything calling a protectedProcedure (session cookie
// required) -- httpBatchLink's default fetch doesn't send cookies
// cross-origin, so this is the one place that turns credentials on.
// HealthCheck/DbHealthCheck predate this and only call publicProcedures, so
// they're left on their own bare clients rather than migrated speculatively.
export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${BACKEND_URL}/trpc`,
      fetch(url, options) {
        return fetch(url, { ...options, credentials: "include" });
      },
    }),
  ],
});
