// The aggregate schema: re-exports Better Auth's generated tables (users,
// sessions, accounts, verifications -- regenerate via `yarn db:auth:generate`,
// don't hand-edit auth-schema.ts) plus our own domain tables -- one file per
// table, re-exported here so drizzle.config.ts's single `schema` entry
// point still picks all of them up.
export * from "./auth-schema.js";
export * from "./terms-and-conditions-schema.js";
export * from "./user-terms-and-conditions-schema.js";
export * from "./auth-protocols-schema.js";
export * from "./roles-schema.js";
export * from "./features-schema.js";
export * from "./feature-roles-schema.js";

// user.viewMode's allowed values live in ../user-fields.ts (imported
// directly from there, not re-exported here) -- it's the one place that
// names them, fed into auth.ts's additionalFields, which is what
// db:auth:generate turns into this file's generated enum columns.
// user.role is no longer one of these -- it's a plain, unconstrained text
// column validated by a real FK onto roles.name instead (see
// roles-schema.ts and that table's own migration), since roles are
// admin-creatable/deletable at runtime, not a fixed compile-time set.
