// The aggregate schema: re-exports Better Auth's generated tables (users,
// sessions, accounts, verifications -- regenerate via `yarn db:auth:generate`,
// don't hand-edit auth-schema.ts) plus our own domain tables -- one file per
// table, re-exported here so drizzle.config.ts's single `schema` entry
// point still picks all of them up. Alphabetical by file name so the
// growing RBAC table set (roles/features/routes/page_views, each with its
// own -roles join table) stays easy to scan.
export * from "./auth-protocols-schema.js";
export * from "./auth-schema.js";
export * from "./feature-roles-schema.js";
export * from "./features-schema.js";
export * from "./page-view-roles-schema.js";
export * from "./page-views-schema.js";
export * from "./roles-schema.js";
export * from "./route-roles-schema.js";
export * from "./routes-schema.js";
export * from "./terms-and-conditions-schema.js";
export * from "./user-terms-and-conditions-schema.js";

// user.viewMode's allowed values live in ../user-fields.ts (imported
// directly from there, not re-exported here) -- it's the one place that
// names them, fed into auth.ts's additionalFields, which is what
// db:auth:generate turns into this file's generated enum columns.
// user.role is no longer one of these -- it's a plain, unconstrained text
// column validated by a real FK onto roles.name instead (see
// roles-schema.ts and that table's own migration), since roles are
// admin-creatable/deletable at runtime, not a fixed compile-time set.
