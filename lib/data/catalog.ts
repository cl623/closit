import type {
  Avatar,
  EquippedPiece,
  FashionItem,
  OutfitSummary,
  OutfitWithItems,
} from "@/lib/outfits/types";
import { LOCAL_AVATARS, LOCAL_ITEMS } from "@/lib/seed/local-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";
import type { ItemCategory } from "@/lib/items/categories";

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapOutfitItems(
  rows: Array<{
    item_id: string;
    slot_category: ItemCategory;
    layer_z?: number | null;
    item: FashionItem | FashionItem[] | null;
  }>,
): EquippedPiece[] {
  return rows
    .map((row) => {
      const item = asSingle(row.item);
      if (!item) return null;
      return {
        ...item,
        layer_z: row.layer_z ?? item.z_index,
      } satisfies EquippedPiece;
    })
    .filter((item): item is EquippedPiece => Boolean(item))
    .sort((a, b) => a.layer_z - b.layer_z);
}

export async function fetchAvatars(): Promise<Avatar[]> {
  if (!isSupabaseConfigured()) {
    return LOCAL_AVATARS.filter((a) => a.is_active);
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("avatars")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error || !data?.length) {
    console.warn("Falling back to local avatars", error?.message);
    return LOCAL_AVATARS.filter((a) => a.is_active);
  }

  return data as Avatar[];
}

export async function fetchWardrobeItems(userId?: string | null): Promise<FashionItem[]> {
  if (!isSupabaseConfigured()) {
    return LOCAL_ITEMS;
  }

  const supabase = createClient();

  if (!userId) {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("is_system", true)
      .order("created_at", { ascending: true });

    if (error || !data?.length) {
      console.warn("Falling back to local items", error?.message);
      return LOCAL_ITEMS;
    }
    return data as FashionItem[];
  }

  const [{ data: ownedOrSystem, error: ownedError }, { data: saves, error: savesError }] =
    await Promise.all([
      supabase
        .from("items")
        .select("*")
        .or(`is_system.eq.true,owner_id.eq.${userId}`)
        .order("created_at", { ascending: true }),
      supabase.from("item_saves").select("item_id, item:items(*)").eq("user_id", userId),
    ]);

  if (ownedError) {
    console.warn("Falling back to local items", ownedError.message);
    return LOCAL_ITEMS;
  }

  const byId = new Map<string, FashionItem>();
  for (const item of ownedOrSystem ?? []) {
    byId.set(item.id, item as FashionItem);
  }

  if (!savesError) {
    for (const row of saves ?? []) {
      const item = asSingle(row.item);
      if (item) byId.set(item.id, item as FashionItem);
    }
  }

  const merged = Array.from(byId.values());
  if (!merged.length) {
    console.warn("Falling back to local items");
    return LOCAL_ITEMS;
  }

  return merged.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export async function fetchOutfit(outfitId: string): Promise<OutfitWithItems | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createClient();
  const { data: outfit, error } = await supabase
    .from("outfits")
    .select("*, avatar:avatars(*)")
    .eq("id", outfitId)
    .maybeSingle();

  if (error || !outfit) {
    return null;
  }

  const { data: outfitItems } = await supabase
    .from("outfit_items")
    .select("item_id, slot_category, layer_z, item:items(*)")
    .eq("outfit_id", outfitId)
    .order("layer_z", { ascending: true });

  return {
    id: outfit.id,
    user_id: outfit.user_id,
    avatar_id: outfit.avatar_id,
    name: outfit.name,
    is_published: outfit.is_published,
    published_at: outfit.published_at ?? null,
    created_at: outfit.created_at,
    updated_at: outfit.updated_at,
    avatar: asSingle(outfit.avatar) as Avatar,
    items: mapOutfitItems(outfitItems ?? []),
  };
}

export async function fetchUserOutfits(userId: string): Promise<OutfitSummary[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("outfits")
    .select("*, avatar:avatars(*), outfit_items(item_id)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    console.warn("Failed to fetch user outfits", error?.message);
    return [];
  }

  return data.map((row) => {
    const avatar = asSingle(row.avatar) as Avatar;
    const itemRows = Array.isArray(row.outfit_items) ? row.outfit_items : [];
    return {
      id: row.id,
      user_id: row.user_id,
      avatar_id: row.avatar_id,
      name: row.name,
      is_published: row.is_published,
      published_at: row.published_at ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      avatar,
      item_count: itemRows.length,
    };
  });
}

export async function saveOutfitDraft(params: {
  outfitId?: string | null;
  userId: string;
  avatarId: string;
  name: string;
  equipped: EquippedPiece[];
}): Promise<{ id: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error("Saving outfits requires Supabase configuration.");
  }

  const supabase = createClient();
  const pieces = params.equipped;
  let outfitId = params.outfitId ?? null;

  if (outfitId) {
    const { error } = await supabase
      .from("outfits")
      .update({
        avatar_id: params.avatarId,
        name: params.name,
      })
      .eq("id", outfitId)
      .eq("user_id", params.userId);

    if (error) throw error;

    await supabase.from("outfit_items").delete().eq("outfit_id", outfitId);
  } else {
    const { data, error } = await supabase
      .from("outfits")
      .insert({
        user_id: params.userId,
        avatar_id: params.avatarId,
        name: params.name,
        is_published: false,
      })
      .select("id")
      .single();

    if (error || !data) throw error ?? new Error("Failed to create outfit");
    outfitId = data.id;
  }

  if (pieces.length > 0) {
    const { error } = await supabase.from("outfit_items").insert(
      pieces.map((piece) => ({
        outfit_id: outfitId!,
        item_id: piece.id,
        slot_category: piece.category,
        layer_z: piece.layer_z,
      })),
    );
    if (error) throw error;
  }

  return { id: outfitId! };
}

export async function deleteUserItem(itemId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Deleting items requires Supabase configuration.");
  }

  const supabase = createClient();
  const { data: item, error: fetchError } = await supabase
    .from("items")
    .select("id, image_path, is_system, owner_id")
    .eq("id", itemId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!item || item.is_system) {
    throw new Error("Cannot delete this item.");
  }

  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) throw error;

  if (item.image_path && !item.image_path.startsWith("/")) {
    await supabase.storage.from("items").remove([item.image_path.replace(/^items\//, "")]);
  }
}

export async function deleteOutfit(outfitId: string, userId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Deleting outfits requires Supabase configuration.");
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("outfits")
    .delete()
    .eq("id", outfitId)
    .eq("user_id", userId);

  if (error) throw error;
}
