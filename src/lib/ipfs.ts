/**
 * Convert any IPFS-style URI (`ipfs://CID/path` or `/ipfs/CID/path`) to an
 * HTTPS URL served by a fast, edge-cached gateway. We use Cloudflare's IPFS
 * gateway — once a CID is fetched, copies are cached on hundreds of edge
 * locations worldwide, so subsequent loads feel instant.
 *
 * Non-IPFS URLs are returned unchanged. Empty input returns "".
 */
const PRIMARY_GATEWAY = "https://cloudflare-ipfs.com/ipfs/";
const FALLBACK_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
];

export function ipfsToHttp(uri: string | null | undefined): string {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) {
    const rest = uri.slice("ipfs://".length).replace(/^ipfs\//, "");
    return PRIMARY_GATEWAY + rest;
  }
  // /ipfs/CID/... style absolute path
  if (uri.startsWith("/ipfs/")) {
    return PRIMARY_GATEWAY + uri.slice("/ipfs/".length);
  }
  // Re-route slow public gateways through the CDN edge.
  for (const slow of FALLBACK_GATEWAYS) {
    if (uri.startsWith(slow)) {
      return PRIMARY_GATEWAY + uri.slice(slow.length);
    }
  }
  return uri;
}

/** Build a srcSet for an HTTPS image URL when the source supports it (Supabase storage). */
export function imageSrcSet(url: string): string | undefined {
  if (!url || !url.includes("/storage/v1/object/public/")) return undefined;
  // Supabase storage doesn't transform — but a future transformer keeps this hook stable.
  return undefined;
}
