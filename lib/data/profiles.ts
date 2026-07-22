import type { Avatar, EquippedPiece, FashionItem, OutfitWithItems } from "@/lib/outfits/types";
import { fetchUserBadges, type BadgeAward } from "@/lib/data/leaderboards";
import { resolveImageUrl } from "@/lib/items/image-url";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";
import { fetchIsAdmin } from "@/lib/data/admin";

export type PublicProfileItem = FashionItem & {
  image_url: string;
};

export type PublicProfile = {
  id: string;
  display_name: string | null;
  created_at: string;
  disabled_at: string | null;
  badges: BadgeAward[];
  publishedOutfits: OutfitWithItems[];
  items: PublicProfileItem[];
};

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function fetchPublicProfile(userId: string): Promise<PublicProfile | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, created_at, disabled_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) return null;

  const isAdmin = await fetchIsAdmin();
  if (profile.disabled_at && !isAdmin) {
    return null;
  }

  const [{ data: outfitRows }, { data: itemRows }, badges] = await Promise.all([
    supabase
      .from("outfits")
      .select("*, avatar:avatars(*)")
      .eq("user_id", userId)
      .eq("is_published", true)
      .order("published_at", { ascending: false }),
    supabase
      .from("items")
      .select("*")
      .eq("owner_id", userId)
      .eq("is_system", false)
      .order("created_at", { ascending: false }),
    fetchUserBadges(userId),
  ]);

  const publishedOutfits: OutfitWithItems[] = [];
  for (const row of outfitRows ?? []) {
    const avatar = asSingle(row.avatar) as Avatar | null;
    if (!avatar) continue;

    const { data: outfitItems } = await supabase
      .from("outfit_items")
      .select("layer_z, item:items(*)")
      .eq("outfit_id", row.id)
      .order("layer_z", { ascending: true });

    const items = (outfitItems ?? [])
      .map((entry) => {
        const item = asSingle(entry.item) as FashionItem | null;
        if (!item) return null;
        return { ...item, layer_z: entry.layer_z ?? item.z_index } satisfies EquippedPiece;
      })
      .filter((item): item is EquippedPiece => item !== null);

    publishedOutfits.push({
      id: row.id,
      user_id: row.user_id,
      avatar_id: row.avatar_id,
      name: row.name,
      is_published: row.is_published,
      published_at: row.published_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      avatar,
      items,
    });
  }

  const items: PublicProfileItem[] = ((itemRows ?? []) as FashionItem[]).map((item) => ({
    ...item,
    image_url: resolveImageUrl(item.image_path),
  }));

  return {
    id: profile.id,
    display_name: profile.display_name,
    created_at: profile.created_at,
    disabled_at: profile.disabled_at,
    badges,
    publishedOutfits,
    items,
  };
}

export async function adminDeleteItem(itemId: string): Promise<void> {
  if (!(await fetchIsAdmin())) throw new Error("Admin access required.");
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_delete_item", { p_item_id: itemId });
  if (error) throw error;
}

export async function adminDisableAccount(userId: string): Promise<void> {
  if (!(await fetchIsAdmin())) throw new Error("Admin access required.");
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_disable_account", { p_user_id: userId });
  if (error) throw error;
}
