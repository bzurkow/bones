// Shared by Better Auth's trustedOrigins and Fastify's CORS config, so
// there's one list of allowed client origins instead of two that can drift
// -- CORS previously reflected any origin (`origin: true`), which was
// looser than it needed to be given this same list already existed for
// Better Auth's own validation.
export const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
