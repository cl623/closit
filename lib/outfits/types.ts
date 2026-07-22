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

/** Item equipped on an outfit with a per-instance layer override. */
export type EquippedPiece = FashionItem & {
  layer_z: number;
};

export type Outfit = {
  id: string;
  user_id: string;
  avatar_id: string;
  name: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OutfitItem = {
  outfit_id: string;
  item_id: string;
  slot_category: ItemCategory;
  layer_z: number;
};

/** @deprecated Prefer EquippedPiece[] — kept only for gradual migration. */
export type EquippedSlots = Partial<Record<ItemCategory, FashionItem>>;

export type OutfitWithItems = Outfit & {
  avatar: Avatar;
  items: EquippedPiece[];
};

export type OutfitSummary = Outfit & {
  avatar: Avatar;
  item_count: number;
};

export type ProfileSummary = {
  id: string;
  display_name: string | null;
};

export type ItemEngagement = {
  item_id: string;
  like_count: number;
  save_count: number;
  liked_by_viewer: boolean;
  saved_by_viewer: boolean;
};

export type FeedOutfit = OutfitWithItems & {
  creator: ProfileSummary;
  like_count: number;
  liked_by_viewer: boolean;
  item_engagement: ItemEngagement[];
  week_rank?: number | null;
};

export type LeaderboardOutfitRow = {
  outfit_id: string;
  outfit_name: string;
  creator_id: string;
  creator_name: string | null;
  avatar_id: string;
  published_at: string | null;
  like_count: number;
  rank: number;
  avatar: Avatar;
  items: EquippedPiece[];
};

export type LeaderboardCreatorRow = {
  creator_id: string;
  creator_name: string | null;
  outfit_like_count: number;
  item_save_count: number;
  rank: number;
};

export type ReportTargetType = "item" | "outfit";
export type ReportStatus = "open" | "resolved" | "dismissed";

export type Report = {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  item_id: string | null;
  outfit_id: string | null;
  reported_user_id: string | null;
  reason: string;
  notes: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
};

export const REPORT_REASONS = [
  "Spam or scam",
  "Inappropriate content",
  "Copyright / stolen art",
  "Harassment",
  "Other",
] as const;
