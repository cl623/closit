import type { Avatar, FashionItem, OutfitWithItems } from "@/lib/outfits/types";
import { LOCAL_AVATARS, LOCAL_ITEMS } from "@/lib/seed/local-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";
import type { ItemCategory } from "@/lib/items/categories";

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
  let query = supabase.from("items").select("*").order("created_at", { ascending: true });

  if (userId) {
    query = query.or(`is_system.eq.true,owner_id.eq.${userId}`);
  } else {
    query = query.eq("is_system", true);
  }

  const { data, error } = await query;

  if (error || !data?.length) {
    console.warn("Falling back to local items", error?.message);
    return LOCAL_ITEMS;
  }

  return data as FashionItem[];
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
    .select("item_id, slot_category, item:items(*)")
    .eq("outfit_id", outfitId);

  const items = (outfitItems ?? [])
    .map((row) => {
      const item = Array.isArray(row.item) ? row.item[0] : row.item;
      return item as FashionItem | undefined;
    })
    .filter((item): item is FashionItem => Boolean(item));

  return {
    id: outfit.id,
    user_id: outfit.user_id,
    avatar_id: outfit.avatar_id,
    name: outfit.name,
    is_published: outfit.is_published,
    created_at: outfit.created_at,
    updated_at: outfit.updated_at,
    avatar: (Array.isArray(outfit.avatar) ? outfit.avatar[0] : outfit.avatar) as Avatar,
    items,
  };
}

export async function saveOutfitDraft(params: {
  outfitId?: string | null;
  userId: string;
  avatarId: string;
  name: string;
  equipped: Partial<Record<ItemCategory, FashionItem>>;
}): Promise<{ id: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error("Saving outfits requires Supabase configuration.");
  }

  const supabase = createClient();
  const slots = Object.entries(params.equipped).filter(
    (entry): entry is [ItemCategory, FashionItem] => Boolean(entry[1]),
  );

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

  if (slots.length > 0) {
    const { error } = await supabase.from("outfit_items").insert(
      slots.map(([slot_category, item]) => ({
        outfit_id: outfitId!,
        item_id: item.id,
        slot_category,
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
