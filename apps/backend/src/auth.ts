import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins/bearer";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/index.js";
import { trustedOrigins } from "./trusted-origins.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", usePlural: true }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  // Lets requests authenticate via `Authorization: Bearer <token>` instead
  // of a cookie -- needed for apps/tauri, where the OAuth flow completes in
  // the system browser (a separate cookie jar from the Tauri webview).
  plugins: [bearer()],
});
