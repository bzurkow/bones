// Single source of truth for user.role / user.viewMode's allowed values --
// fed into auth.ts's additionalFields (which is what `db:auth:generate`
// turns into auth-schema.ts's generated enum columns), and re-exported
// type-only from trpc/router.ts for the frontend.
export const USER_ROLES = ["owner", "administrator", "standard", "demo"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const VIEW_MODES = ["light", "dark"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];
