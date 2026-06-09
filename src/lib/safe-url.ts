// Returns the URL only if it uses http(s); otherwise undefined. Blocks javascript:, data:, etc.
export function safeHttpUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return undefined;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

// Returns a CSS-safe `url("…")` value, or undefined. Prevents CSS url() injection
// by rejecting URLs containing characters that could break out of the url() context.
export function safeCssUrl(url?: string | null): string | undefined {
  const safe = safeHttpUrl(url);
  if (!safe) return undefined;
  // Reject any character that could escape the url("…") string context.
  if (/["'()\\\s]/.test(safe)) return undefined;
  return `url("${safe}")`;
}

// Returns a notification/router-safe internal path, or "/" as fallback.
// Blocks external URLs and protocol-relative redirects.
export function safeInternalPath(path?: string | null): string {
  if (!path) return "/";
  // Must start with single "/", not "//" (protocol-relative) or "/\" tricks.
  if (!/^\/[^/\\]/.test(path) && path !== "/") return "/";
  // Disallow newlines / control chars.
  if (/[\s\x00-\x1f]/.test(path)) return "/";
  return path;
}
