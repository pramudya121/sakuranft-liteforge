import { supabase } from "@/integrations/supabase/client";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function uploadImage(file: File, folder = "profile"): Promise<string> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Only PNG, JPEG, WEBP, or GIF images are allowed.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("nft-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from("nft-images").getPublicUrl(path).data.publicUrl;
}
