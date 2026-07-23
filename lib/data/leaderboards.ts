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

function currentPeriodKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Live current-month badge standings derived from leaderboard views (no writes). */
async function fetchLiveMonthlyBadges(userId: string): Promise<BadgeAward[]> {
  const supabase = createClient();
  const period = currentPeriodKey();
  const awarded_at = new Date().toISOString();

  const [{ data: creators }, { data: outfits }, { data: badgeDefs }] = await Promise.all([
    supabase
      .from("leaderboard_creators_month")
      .select("creator_id")
      .order("outfit_like_count", { ascending: false })
      .order("item_save_count", { ascending: false })
      .limit(3),
    supabase
      .from("leaderboard_outfits_month")
      .select("creator_id, like_count")
      .order("like_count", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(1),
    supabase.from("badges").select("id, name, description"),
  ]);

  const defMap = new Map(
    (badgeDefs ?? []).map((b: { id: string; name: string; description: string }) => [b.id, b]),
  );
  const awards: BadgeAward[] = [];

  (creators ?? []).forEach((row: { creator_id: string }, index: number) => {
    if (row.creator_id !== userId) return;
    if (index === 0) {
      const top = defMap.get("monthly_top_creator");
      awards.push({
        badge_id: "monthly_top_creator",
        name: top?.name ?? "Top Creator",
        description: top?.description ?? "",
        period_key: period,
        awarded_at,
      });
    }
    const trend = defMap.get("monthly_trendsetter");
    awards.push({
      badge_id: "monthly_trendsetter",
      name: trend?.name ?? "Trendsetter",
      description: trend?.description ?? "",
      period_key: period,
      awarded_at,
    });
  });

  const styleStar = outfits?.[0];
  if (styleStar && styleStar.like_count > 0 && styleStar.creator_id === userId) {
    const star = defMap.get("monthly_style_star");
    awards.push({
      badge_id: "monthly_style_star",
      name: star?.name ?? "Style Star",
      description: star?.description ?? "",
      period_key: period,
      awarded_at,
    });
  }

  return awards;
}

export async function fetchUserBadges(userId: string): Promise<BadgeAward[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createClient();
  const period = currentPeriodKey();

  const [{ data, error }, live] = await Promise.all([
    supabase
      .from("user_badges")
      .select("badge_id, period_key, awarded_at, badge:badges(name, description)")
      .eq("user_id", userId)
      .order("awarded_at", { ascending: false }),
    fetchLiveMonthlyBadges(userId),
  ]);

  if (error) {
    console.warn("Failed to fetch badges", error.message);
  }

  const stored = (data ?? [])
    .filter((row) => row.period_key !== period)
    .map((row) => {
      const badge = asSingle(row.badge) as { name: string; description: string } | null;
      return {
        badge_id: row.badge_id,
        name: badge?.name ?? row.badge_id,
        description: badge?.description ?? "",
        period_key: row.period_key,
        awarded_at: row.awarded_at,
      } satisfies BadgeAward;
    });

  return [...live, ...stored];
}
