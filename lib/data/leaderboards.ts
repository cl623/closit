import type {
  Avatar,
  EquippedPiece,
  FashionItem,
  LeaderboardCreatorRow,
  LeaderboardOutfitRow,
} from "@/lib/outfits/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function fetchTopOutfitsOfWeek(
  limit = 10,
): Promise<LeaderboardOutfitRow[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("leaderboard_outfits_week")
    .select("*")
    .order("like_count", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !data?.length) {
    if (error) console.warn("Failed to fetch outfit leaderboard", error.message);
    return [];
  }

  const rows = await Promise.all(
    data.map(async (row, index): Promise<LeaderboardOutfitRow | null> => {
      const [{ data: avatarRow }, { data: outfitItems }] = await Promise.all([
        supabase.from("avatars").select("*").eq("id", row.avatar_id).maybeSingle(),
        supabase
          .from("outfit_items")
          .select("layer_z, item:items(*)")
          .eq("outfit_id", row.outfit_id)
          .order("layer_z", { ascending: true }),
      ]);

      const avatar = avatarRow as Avatar | null;
      if (!avatar) return null;

      const items = (outfitItems ?? [])
        .map((entry) => {
          const item = asSingle(entry.item) as FashionItem | null;
          if (!item) return null;
          return {
            ...item,
            layer_z: entry.layer_z ?? item.z_index,
          } satisfies EquippedPiece;
        })
        .filter((item): item is EquippedPiece => item !== null);

      return {
        outfit_id: row.outfit_id,
        outfit_name: row.outfit_name,
        creator_id: row.creator_id,
        creator_name: row.creator_name,
        avatar_id: row.avatar_id,
        published_at: row.published_at,
        like_count: row.like_count,
        rank: index + 1,
        avatar,
        items,
      };
    }),
  );

  return rows.filter((row): row is LeaderboardOutfitRow => row !== null);
}

export async function fetchTopCreators(limit = 10): Promise<LeaderboardCreatorRow[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("leaderboard_creators_week")
    .select("*")
    .order("outfit_like_count", { ascending: false })
    .order("item_save_count", { ascending: false })
    .limit(limit);

  if (error || !data?.length) {
    if (error) console.warn("Failed to fetch creator leaderboard", error.message);
    return [];
  }

  return data.map((row, index) => ({
    creator_id: row.creator_id,
    creator_name: row.creator_name,
    outfit_like_count: row.outfit_like_count,
    item_save_count: row.item_save_count,
    rank: index + 1,
  }));
}
