import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Resolve a stored image_path to a browser-usable URL. */
export function resolveImageUrl(imagePath: string): string {
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  if (imagePath.startsWith("/")) {
    return imagePath;
  }

  // Storage object path: items/{userId}/{file}
  const envConfigured = isSupabaseConfigured();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (envConfigured && base) {
    return `${base}/storage/v1/object/public/${imagePath}`;
  }

  return `/${imagePath}`;
}
