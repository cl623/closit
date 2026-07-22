import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

export async function fetchIsAdmin(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error) {
    console.warn("Failed to check admin status", error.message);
    return false;
  }

  return Boolean(data?.is_admin);
}
