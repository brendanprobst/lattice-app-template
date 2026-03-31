/** Default post-login route when `next` is missing or unsafe (open-redirect guard). */
export const DEFAULT_POST_LOGIN_PATH = "/things";

/**
 * Allow only same-origin relative paths for `?next=` — rejects protocol-relative and
 * absolute URLs.
 */
export function safeNextPath(raw: string | null): string {
  if (raw == null || raw === "") {
    return DEFAULT_POST_LOGIN_PATH;
  }
  let path: string;
  try {
    path = decodeURIComponent(raw);
  } catch {
    return DEFAULT_POST_LOGIN_PATH;
  }
  if (!path.startsWith("/") || path.startsWith("//")) {
    return DEFAULT_POST_LOGIN_PATH;
  }
  // Reject `http:`, `javascript:`, etc. if ever passed decoded
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(path)) {
    return DEFAULT_POST_LOGIN_PATH;
  }
  return path;
}
