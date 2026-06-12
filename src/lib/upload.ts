import { supabase } from "@/integrations/supabase/client";

export const ALLOWED_IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const ALLOWED_MIME = ALLOWED_IMAGE_MIME;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_BYTES = MAX_IMAGE_BYTES;

/** Validate file MIME + size. Throws on invalid input. */
export function assertSafeImage(file: File) {
  if (!ALLOWED_IMAGE_MIME.has(file.type)) {
    throw new Error("Only PNG, JPEG, WEBP, or GIF images are allowed.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }
}
const MAX_DIMENSION = 2048; // px — anything larger gets downscaled

/**
 * Compress an image to WebP (preferred) using OffscreenCanvas / canvas.
 * Falls back to the original blob if the browser can't transcode (e.g. GIF).
 */
async function compressToWebp(file: File, quality = 0.85): Promise<Blob> {
  // GIFs (potentially animated) are passed through untouched.
  if (file.type === "image/gif") return file;
  // Already small enough? Skip work.
  if (file.size < 200 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    // Prefer OffscreenCanvas where available — runs off the main thread.
    const canUseOffscreen = typeof OffscreenCanvas !== "undefined";
    if (canUseOffscreen) {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await canvas.convertToBlob({ type: "image/webp", quality });
      return blob.size < file.size ? blob : file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob(res, "image/webp", quality),
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export async function uploadImage(file: File, folder = "profile"): Promise<string> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Only PNG, JPEG, WEBP, or GIF images are allowed.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const compressed = await compressToWebp(file);
  const isWebp = compressed.type === "image/webp" && compressed !== file;
  const ext = isWebp
    ? "webp"
    : (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const contentType = isWebp ? "image/webp" : file.type;
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from("nft-images")
    .upload(path, compressed, { contentType, upsert: false, cacheControl: "31536000" });
  if (error) throw error;
  return supabase.storage.from("nft-images").getPublicUrl(path).data.publicUrl;
}
