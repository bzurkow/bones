// Mirrors backend/src/auth.ts's isStrongPassword/PASSWORD_RULES_MESSAGE --
// that's the enforced rule; this is only for instant client-side feedback
// (disabling submit, showing the hint) before a request ever goes out.
// backend's own package exports are types-only (see its package.json), so
// this can't just be imported -- keep both in sync if either changes.
export const PASSWORD_RULES_MESSAGE = "Password must be at least 8 characters and include a letter, a number, and a special character.";

export function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password);
}
