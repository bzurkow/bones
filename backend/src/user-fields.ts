// Single source of truth for user.viewMode's allowed values -- fed into
// auth.ts's additionalFields (which is what `db:auth:generate` turns into
// auth-schema.ts's generated enum columns), and re-exported type-only from
// trpc/router.ts for the web app.
//
// user.role used to live here too (a fixed USER_ROLES union), but roles are
// admin-creatable/deletable now (db/roles-schema.ts) -- a plain string,
// validated by a real FK onto roles.name instead of a compile-time enum.
// UserRole stays as an alias (not just inlining `string` at every call
// site) purely for readability -- it carries zero extra type safety over
// `string` now.
export type UserRole = string;

export const VIEW_MODES = ["light", "dark"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

// Avatar upload constraints -- enforced in trpc/routers/profile.ts
// (content type server-side, since S3 itself checks the presigned
// request's Content-Type; size is a client-side-only check, see that
// router's comment for why). Mirrored client-side in
// web-app/src/AuthHelpers/avatar-rules.ts -- same duplication precedent as
// password-rules.ts, since backend's package exports are types-only.
export const ALLOWED_AVATAR_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AvatarContentType = (typeof ALLOWED_AVATAR_CONTENT_TYPES)[number];
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
