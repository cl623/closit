export const ITEM_CATEGORIES = [
  "hair",
  "accessory",
  "outerwear",
  "top",
  "bottom",
  "shoes",
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export type LayerCategory = ItemCategory | "base";

export function zIndexForCategory(category: LayerCategory): number {
  switch (category) {
    case "base":
      return 0;
    case "shoes":
      return 10;
    case "bottom":
      return 20;
    case "top":
      return 30;
    case "outerwear":
      return 40;
    case "accessory":
      return 50;
    case "hair":
      return 60;
    default: {
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}

export function isItemCategory(value: string): value is ItemCategory {
  return (ITEM_CATEGORIES as readonly string[]).includes(value);
}

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  hair: "Hair",
  accessory: "Accessories",
  outerwear: "Outerwear",
  top: "Tops",
  bottom: "Bottoms",
  shoes: "Shoes",
};
