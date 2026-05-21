import { supabase } from "@/integrations/supabase/client";

export async function uploadImage(file: File, folder = "profile"): Promise<string> {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("nft-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from("nft-images").getPublicUrl(path).data.publicUrl;
}
