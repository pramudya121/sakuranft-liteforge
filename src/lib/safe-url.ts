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
