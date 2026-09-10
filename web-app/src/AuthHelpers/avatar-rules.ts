// Mirrors backend/src/user-fields.ts's ALLOWED_AVATAR_CONTENT_TYPES/
// MAX_AVATAR_BYTES -- backend's own package exports are types-only, so
// these can't just be imported (same duplication precedent as
// password-rules.ts). Used for instant client-side validation before a
// file ever gets uploaded; content-type is also enforced server-side (S3
// checks it against what the presigned request was signed for), size is
// this check only -- see that file's comment for why.
export const ALLOWED_AVATAR_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function isAllowedAvatarFile(file: File): string | null {
  if (!ALLOWED_AVATAR_CONTENT_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_CONTENT_TYPES)[number])) {
    return "Please choose a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return "That image is too large -- 5MB max.";
  }
  return null;
}
