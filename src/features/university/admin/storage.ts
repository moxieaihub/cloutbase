import { supabase } from "@/integrations/supabase/client";

const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 5; // 5 years

export async function uploadCourseAsset(
  courseId: string,
  kind: "thumb" | "pdf",
  file: File,
): Promise<string> {
  const folder = kind === "thumb" ? "thumbnails" : `workbooks/${courseId}`;
  const path = `${folder}/${courseId}-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;

  const { error } = await supabase.storage.from("course-assets").upload(path, file, { upsert: true });
  if (error) throw error;

  const { data, error: signError } = await supabase.storage
    .from("course-assets")
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signError) throw signError;
  return data.signedUrl;
}
