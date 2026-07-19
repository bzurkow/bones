// The aggregate schema: re-exports Better Auth's generated tables (users,
// sessions, accounts, verifications -- regenerate via `yarn db:auth:generate`,
// don't hand-edit auth-schema.ts) plus our own domain tables as they're added.
export * from "./auth-schema.js";
