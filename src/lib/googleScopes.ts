/**
 * Google OAuth scopes used by the Connect Google flow.
 * Trimmed to the minimum: Calendar events + basic profile/email.
 * Gmail and Drive scopes were removed; restore them if/when those
 * features are actually built (see git history for prior scope set).
 */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "openid",
] as const;

export const GOOGLE_SCOPE_STRING = GOOGLE_SCOPES.join(" ");
