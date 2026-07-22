"use client";

import {
  CATEGORY_LABELS,
  ITEM_CATEGORIES,
  type ItemCategory,
} from "@/lib/items/categories";
import { resolveImageUrl } from "@/lib/items/image-url";
import type { FashionItem } from "@/lib/outfits/types";

type WardrobePanelProps = {
  items: FashionItem[];
  activeCategory: ItemCategory;
  equipped: Partial<Record<ItemCategory, FashionItem>>;
  currentUserId?: string | null;
  onCategoryChange: (category: ItemCategory) => void;
  onEquip: (item: FashionItem) => void;
  onUnequip: (category: ItemCategory) => void;
  onDeleteItem?: (item: FashionItem) => void;
};

export function WardrobePanel({
  items,
  activeCategory,
  equipped,
  currentUserId,
  onCategoryChange,
  onEquip,
  onUnequip,
  onDeleteItem,
}: WardrobePanelProps) {
  const filtered = items.filter((item) => item.category === activeCategory);
  const equippedItem = equipped[activeCategory];

  return (
    <div className="flex h-full flex-col rounded-3xl border border-border bg-surface">
      <div className="flex flex-wrap gap-2 border-b border-border p-3">
        {ITEM_CATEGORIES.map((category) => {
          const selected = category === activeCategory;
          return (
            <button
              key={category}
              type="button"
              onClick={() => onCategoryChange(category)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                selected
                  ? "bg-accent text-white"
                  : "border border-border text-muted hover:border-accent hover:text-foreground"
              }`}
            >
              {CATEGORY_LABELS[category]}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <span className="text-muted">{CATEGORY_LABELS[activeCategory]}</span>
        {equippedItem && (
          <button
            type="button"
            onClick={() => onUnequip(activeCategory)}
            className="text-accent hover:text-accent-deep"
          >
            Unequip
          </button>
        )}
      </div>

      <ul className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-3 sm:grid-cols-3">
        {filtered.map((item) => {
          const isEquipped = equippedItem?.id === item.id;
          const canDelete =
            Boolean(onDeleteItem) &&
            !item.is_system &&
            item.owner_id &&
            item.owner_id === currentUserId;

          return (
            <li key={item.id} className="relative">
              <button
                type="button"
                onClick={() => onEquip(item)}
                className={`flex w-full flex-col items-center gap-2 rounded-2xl border p-3 text-left transition ${
                  isEquipped
                    ? "border-accent bg-orange-50"
                    : "border-border bg-background hover:border-accent/60"
                }`}
              >
                <div className="flex h-20 w-full items-center justify-center rounded-xl bg-stage">
                  <img
                    src={resolveImageUrl(item.image_path)}
                    alt=""
                    className="max-h-16 max-w-[80%] object-contain"
                  />
                </div>
                <div className="w-full">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="truncate text-xs text-muted">
                    {item.color}
                    {item.style ? ` · ${item.style}` : ""}
                  </p>
                </div>
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => onDeleteItem?.(item)}
                  className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-red-700 shadow"
                >
                  Delete
                </button>
              )}
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="col-span-full py-8 text-center text-sm text-muted">
            No items in this category yet.
          </li>
        )}
      </ul>
    </div>
  );
}
