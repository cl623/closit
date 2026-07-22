import type { ItemCategory } from "@/lib/items/categories";

export type Avatar = {
  id: string;
  name: string;
  image_path: string;
  body_width: number;
  body_height: number;
  is_active: boolean;
};

export type FashionItem = {
  id: string;
  owner_id: string | null;
  name: string;
  image_path: string;
  category: ItemCategory;
  color: string;
  style: string;
  anchor_x: number;
  anchor_y: number;
  z_index: number;
  is_system: boolean;
  created_at: string;
};

export type Outfit = {
  id: string;
  user_id: string;
  avatar_id: string;
  name: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type OutfitItem = {
  outfit_id: string;
  item_id: string;
  slot_category: ItemCategory;
};

export type EquippedSlots = Partial<Record<ItemCategory, FashionItem>>;

export type OutfitWithItems = Outfit & {
  avatar: Avatar;
  items: FashionItem[];
};
