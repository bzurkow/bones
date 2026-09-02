import { users } from "./auth-schema.js";

// The aggregate schema: re-exports Better Auth's generated tables (users,
// sessions, accounts, verifications -- regenerate via `yarn db:auth:generate`,
// don't hand-edit auth-schema.ts) plus our own domain tables as they're added.
export * from "./auth-schema.js";

// users.role's allowed values, for code that wants the full list (e.g. a
// future API's validation, or a role picker) without hand-duplicating it --
// derived from the generated column's own enum, not retyped here, so the
// one place that actually names all three stays auth.ts's
// `user.additionalFields.role` (regenerated into auth-schema.ts's
// `text("role", { enum: [...] })` via `db:auth:generate`).
export const USER_ROLES = users.role.enumValues;
export type UserRole = (typeof USER_ROLES)[number];

// Same reasoning as USER_ROLES, for user.additionalFields.viewMode.
export const USER_VIEW_MODES = users.viewMode.enumValues;
export type UserViewMode = (typeof USER_VIEW_MODES)[number];
