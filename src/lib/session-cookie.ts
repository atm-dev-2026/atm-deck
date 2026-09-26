// Auth.js names the database-session cookie with a `__Secure-` prefix over HTTPS.
export const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

/**
 * The raw Auth.js session token from a request's Cookie header, read straight
 * off the request (not `cookies()`) so route handlers invoked directly in tests
 * can supply it.
 */
export function readSessionToken(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (SESSION_COOKIES.includes(name)) {
      return decodeURIComponent(part.slice(eq + 1).trim()) || null;
    }
  }
  return null;
}
