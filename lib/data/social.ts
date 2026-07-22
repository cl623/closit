import type {
  Avatar,
  EquippedPiece,
  FashionItem,
  FeedOutfit,
  ItemEngagement,
  ProfileSummary,
} from "@/lib/outfits/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("This action requires Supabase configuration.");
  }
  return createClient();
}

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function getViewerId(): Promise<string | null> {
  const supabase = requireSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function loadOutfitItems(outfitId: string): Promise<EquippedPiece[]> {
  const supabase = requireSupabase();
  const { data: outfitItems } = await supabase
    .from("outfit_items")
    .select("item_id, slot_category, layer_z, item:items(*)")
    .eq("outfit_id", outfitId)
    .order("layer_z", { ascending: true });

  return (outfitItems ?? [])
    .map((row) => {
      const item = asSingle(row.item) as FashionItem | null;
      if (!item) return null;
      return {
        ...item,
        layer_z: row.layer_z ?? item.z_index,
      } satisfies EquippedPiece;
    })
    .filter((item): item is EquippedPiece => item !== null);
}

async function loadItemEngagement(
  itemIds: string[],
  viewerId: string | null,
): Promise<ItemEngagement[]> {
  if (itemIds.length === 0) return [];

  const supabase = requireSupabase();

  const [{ data: counts }, viewerLikesResult, viewerSavesResult] = await Promise.all([
    supabase.rpc("count_item_engagement", { p_item_ids: itemIds }),
    viewerId
      ? supabase
          .from("item_likes")
          .select("item_id")
          .eq("user_id", viewerId)
          .in("item_id", itemIds)
      : Promise.resolve({ data: [] as { item_id: string }[] }),
    viewerId
      ? supabase
          .from("item_saves")
          .select("item_id")
          .eq("user_id", viewerId)
          .in("item_id", itemIds)
      : Promise.resolve({ data: [] as { item_id: string }[] }),
  ]);

  const likeCounts = new Map<string, number>();
  const saveCounts = new Map<string, number>();
  for (const row of counts ?? []) {
    likeCounts.set(row.item_id, Number(row.like_count ?? 0));
    saveCounts.set(row.item_id, Number(row.save_count ?? 0));
  }

  const likedByViewer = new Set((viewerLikesResult.data ?? []).map((r) => r.item_id));
  const savedByViewer = new Set((viewerSavesResult.data ?? []).map((r) => r.item_id));

  return itemIds.map((item_id) => ({
    item_id,
    like_count: likeCounts.get(item_id) ?? 0,
    save_count: saveCounts.get(item_id) ?? 0,
    liked_by_viewer: likedByViewer.has(item_id),
    saved_by_viewer: savedByViewer.has(item_id),
  }));
}

async function loadOutfitLikeState(
  outfitIds: string[],
  viewerId: string | null,
): Promise<{ counts: Map<string, number>; liked: Set<string> }> {
  const counts = new Map<string, number>();
  const liked = new Set<string>();
  if (outfitIds.length === 0) return { counts, liked };

  const supabase = requireSupabase();
  const [{ data: likeCounts }, viewerLikesResult] = await Promise.all([
    supabase.rpc("count_outfit_likes", { p_outfit_ids: outfitIds }),
    viewerId
      ? supabase
          .from("outfit_likes")
          .select("outfit_id")
          .eq("user_id", viewerId)
          .in("outfit_id", outfitIds)
      : Promise.resolve({ data: [] as { outfit_id: string }[] }),
  ]);

  for (const row of likeCounts ?? []) {
    counts.set(row.outfit_id, Number(row.like_count ?? 0));
  }
  for (const row of viewerLikesResult.data ?? []) {
    liked.add(row.outfit_id);
  }

  return { counts, liked };
}

async function hydrateFeedOutfits(
  rows: Array<{
    id: string;
    user_id: string;
    avatar_id: string;
    name: string;
    is_published: boolean;
    published_at: string | null;
    created_at: string;
    updated_at: string;
    avatar: Avatar | Avatar[] | null;
    creator: ProfileSummary | ProfileSummary[] | null;
  }>,
  viewerId: string | null,
): Promise<FeedOutfit[]> {
  if (rows.length === 0) return [];

  const outfitIds = rows.map((r) => r.id);
  const { counts, liked } = await loadOutfitLikeState(outfitIds, viewerId);

  const hydrated = await Promise.all(
    rows.map(async (row): Promise<FeedOutfit | null> => {
      const items = await loadOutfitItems(row.id);
      const item_engagement = await loadItemEngagement(
        items.map((i) => i.id),
        viewerId,
      );
      const avatar = asSingle(row.avatar);
      const creator = asSingle(row.creator);

      if (!avatar || !creator) return null;

      return {
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
        creator,
        like_count: counts.get(row.id) ?? 0,
        liked_by_viewer: liked.has(row.id),
        item_engagement,
      };
    }),
  );

  return hydrated.filter((row): row is FeedOutfit => row !== null);
}

export async function publishOutfit(outfitId: string): Promise<void> {
  const supabase = requireSupabase();
  const viewerId = await getViewerId();
  if (!viewerId) throw new Error("Sign in to publish outfits.");

  const { count, error: countError } = await supabase
    .from("outfit_items")
    .select("item_id", { count: "exact", head: true })
    .eq("outfit_id", outfitId);

  if (countError) throw countError;
  if (!count || count < 1) {
    throw new Error("Equip at least one item before publishing.");
  }

  const { data, error } = await supabase
    .from("outfits")
    .update({
      is_published: true,
      published_at: new Date().toISOString(),
    })
    .eq("id", outfitId)
    .eq("user_id", viewerId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Outfit not found or you do not own it.");
}

export async function unpublishOutfit(outfitId: string): Promise<void> {
  const supabase = requireSupabase();
  const viewerId = await getViewerId();
  if (!viewerId) throw new Error("Sign in to unpublish outfits.");

  const { data, error } = await supabase
    .from("outfits")
    .update({
      is_published: false,
      published_at: null,
    })
    .eq("id", outfitId)
    .eq("user_id", viewerId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Outfit not found or you do not own it.");
}

export async function fetchFeed(params?: {
  limit?: number;
  cursor?: string | null;
}): Promise<{ outfits: FeedOutfit[]; nextCursor: string | null }> {
  if (!isSupabaseConfigured()) {
    return { outfits: [], nextCursor: null };
  }

  const limit = params?.limit ?? 20;
  const supabase = createClient();
  const viewerId = (await supabase.auth.getUser()).data.user?.id ?? null;

  let query = supabase
    .from("outfits")
    .select("*, avatar:avatars(*), creator:profiles!outfits_user_id_fkey(id, display_name)")
    .eq("is_published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit + 1);

  if (params?.cursor) {
    query = query.lt("published_at", params.cursor);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("Failed to fetch feed", error.message);
    return { outfits: [], nextCursor: null };
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const outfits = await hydrateFeedOutfits(page, viewerId);
  const last = page[page.length - 1];
  const nextCursor = hasMore && last?.published_at ? last.published_at : null;

  return { outfits, nextCursor };
}

export async function fetchPublishedOutfit(outfitId: string): Promise<FeedOutfit | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createClient();
  const viewerId = (await supabase.auth.getUser()).data.user?.id ?? null;

  const { data, error } = await supabase
    .from("outfits")
    .select("*, avatar:avatars(*), creator:profiles!outfits_user_id_fkey(id, display_name)")
    .eq("id", outfitId)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) return null;

  const [outfit] = await hydrateFeedOutfits([data], viewerId);
  return outfit ?? null;
}

export async function toggleOutfitLike(
  outfitId: string,
): Promise<{ liked: boolean; like_count: number }> {
  const supabase = requireSupabase();
  const viewerId = await getViewerId();
  if (!viewerId) throw new Error("Sign in to like outfits.");

  const { data: existing } = await supabase
    .from("outfit_likes")
    .select("outfit_id")
    .eq("user_id", viewerId)
    .eq("outfit_id", outfitId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("outfit_likes")
      .delete()
      .eq("user_id", viewerId)
      .eq("outfit_id", outfitId);
    if (error) throw error;
  } else {
    const { data: outfit, error: outfitError } = await supabase
      .from("outfits")
      .select("id")
      .eq("id", outfitId)
      .eq("is_published", true)
      .maybeSingle();
    if (outfitError) throw outfitError;
    if (!outfit) throw new Error("Only published outfits can be liked.");

    const { error } = await supabase.from("outfit_likes").insert({
      user_id: viewerId,
      outfit_id: outfitId,
    });
    if (error) throw error;
  }

  const { data: counts, error: countError } = await supabase.rpc("count_outfit_likes", {
    p_outfit_ids: [outfitId],
  });
  if (countError) throw countError;

  const likeCount = Number(counts?.[0]?.like_count ?? 0);
  return { liked: !existing, like_count: likeCount };
}

export async function toggleItemLike(
  itemId: string,
): Promise<{ liked: boolean; like_count: number }> {
  const supabase = requireSupabase();
  const viewerId = await getViewerId();
  if (!viewerId) throw new Error("Sign in to like items.");

  const { data: existing } = await supabase
    .from("item_likes")
    .select("item_id")
    .eq("user_id", viewerId)
    .eq("item_id", itemId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("item_likes")
      .delete()
      .eq("user_id", viewerId)
      .eq("item_id", itemId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("item_likes").insert({
      user_id: viewerId,
      item_id: itemId,
    });
    if (error) throw error;
  }

  const { data: counts, error: countError } = await supabase.rpc("count_item_engagement", {
    p_item_ids: [itemId],
  });
  if (countError) throw countError;

  return { liked: !existing, like_count: Number(counts?.[0]?.like_count ?? 0) };
}

export async function toggleItemSave(
  itemId: string,
): Promise<{ saved: boolean; save_count: number }> {
  const supabase = requireSupabase();
  const viewerId = await getViewerId();
  if (!viewerId) throw new Error("Sign in to save items.");

  const { data: existing } = await supabase
    .from("item_saves")
    .select("item_id")
    .eq("user_id", viewerId)
    .eq("item_id", itemId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("item_saves")
      .delete()
      .eq("user_id", viewerId)
      .eq("item_id", itemId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("item_saves").insert({
      user_id: viewerId,
      item_id: itemId,
    });
    if (error) throw error;
  }

  const { data: counts, error: countError } = await supabase.rpc("count_item_engagement", {
    p_item_ids: [itemId],
  });
  if (countError) throw countError;

  return { saved: !existing, save_count: Number(counts?.[0]?.save_count ?? 0) };
}
