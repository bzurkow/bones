// Mirrors backend/src/auth.ts's user.additionalFields (inheritViewModeFromBrowser
// / viewMode) -- same reasoning as roles.ts's UserRole: better-auth's session
// type isn't parameterized with our additionalFields here (see auth-client.ts),
// so these reach the client at runtime but not in session.user's static type.
export type ViewMode = "light" | "dark";

export interface ViewSettings {
  inheritViewModeFromBrowser: boolean;
  viewMode: ViewMode;
}

export function getViewSettings(user: unknown): ViewSettings {
  const settings = user as
    | { inheritViewModeFromBrowser?: unknown; viewMode?: unknown }
    | null
    | undefined;
  return {
    inheritViewModeFromBrowser:
      typeof settings?.inheritViewModeFromBrowser === "boolean"
        ? settings.inheritViewModeFromBrowser
        : true,
    viewMode: settings?.viewMode === "dark" ? "dark" : "light",
  };
}
