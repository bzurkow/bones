// Single source of truth for user.role / user.viewMode's allowed values --
// fed into auth.ts's additionalFields (which is what `db:auth:generate`
// turns into auth-schema.ts's generated enum columns), and re-exported
// type-only from trpc/router.ts for the web app.
export const USER_ROLES = ["owner", "administrator", "standard", "demo"] as const;
export type UserRole = (typeof USER_ROLES)[number];

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
