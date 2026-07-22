import type {
  Avatar,
  EquippedPiece,
  FashionItem,
  LeaderboardCreatorRow,
  LeaderboardOutfitRow,
} from "@/lib/outfits/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

export type BadgeAward = {
  badge_id: string;
  name: string;
  description: string;
  period_key: string;
  awarded_at: string;
};

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function hydrateOutfitRows(
  data: Array<{
    outfit_id: string;
    outfit_name: string;
    creator_id: string;
    creator_name: string | null;
    avatar_id: string;
    published_at: string | null;
    like_count: number;
  }>,
): Promise<LeaderboardOutfitRow[]> {
  const supabase = createClient();

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

export async function fetchTopOutfitsOfWeek(limit = 10): Promise<LeaderboardOutfitRow[]> {
  if (!isSupabaseConfigured()) return [];

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

  return hydrateOutfitRows(data);
}

export async function fetchTopCreators(limit = 10): Promise<LeaderboardCreatorRow[]> {
  if (!isSupabaseConfigured()) return [];

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

export async function fetchTopOutfitsOfMonth(limit = 10): Promise<LeaderboardOutfitRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createClient();
  await supabase.rpc("sync_monthly_badges");

  const { data, error } = await supabase
    .from("leaderboard_outfits_month")
    .select("*")
    .order("like_count", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !data?.length) {
    if (error) console.warn("Failed to fetch monthly outfit leaderboard", error.message);
    return [];
  }

  return hydrateOutfitRows(data);
}

export async function fetchTopCreatorsOfMonth(limit = 10): Promise<LeaderboardCreatorRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createClient();
  await supabase.rpc("sync_monthly_badges");

  const { data, error } = await supabase
    .from("leaderboard_creators_month")
    .select("*")
    .order("outfit_like_count", { ascending: false })
    .order("item_save_count", { ascending: false })
    .limit(limit);

  if (error || !data?.length) {
    if (error) console.warn("Failed to fetch monthly creator leaderboard", error.message);
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

export async function fetchUserBadges(userId: string): Promise<BadgeAward[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_badges")
    .select("badge_id, period_key, awarded_at, badge:badges(name, description)")
    .eq("user_id", userId)
    .order("awarded_at", { ascending: false });

  if (error || !data) {
    if (error) console.warn("Failed to fetch badges", error.message);
    return [];
  }

  return data.map((row) => {
    const badge = asSingle(row.badge) as { name: string; description: string } | null;
    return {
      badge_id: row.badge_id,
      name: badge?.name ?? row.badge_id,
      description: badge?.description ?? "",
      period_key: row.period_key,
      awarded_at: row.awarded_at,
    };
  });
}
