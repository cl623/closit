"use client";

import { CATEGORY_LABELS } from "@/lib/items/categories";
import { resolveImageUrl } from "@/lib/items/image-url";
import type { EquippedPiece } from "@/lib/outfits/types";

type LayerStackProps = {
  equipped: EquippedPiece[];
  selectedItemId: string | null;
  onSelect: (itemId: string) => void;
  onBringForward: (itemId: string) => void;
  onSendBackward: (itemId: string) => void;
  onUnequip: (itemId: string) => void;
};

/** Lists equipped pieces front-to-back with layer order controls. */
export function LayerStack({
  equipped,
  selectedItemId,
  onSelect,
  onBringForward,
  onSendBackward,
  onUnequip,
}: LayerStackProps) {
  const frontToBack = [...equipped].sort((a, b) => b.layer_z - a.layer_z);

  if (frontToBack.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-surface px-4 py-6 text-sm text-muted">
        Equip pieces to adjust layer order. Multiple items per category are allowed.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-[family-name:var(--font-display)] text-lg">Layers</h2>
        <p className="text-xs text-muted">Front → back</p>
      </div>
      <ol className="space-y-2">
        {frontToBack.map((piece, index) => {
          const selected = piece.id === selectedItemId;
          return (
            <li
              key={piece.id}
              className={`flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-2 ${
                selected ? "border-accent bg-orange-50" : "border-border bg-background"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(piece.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <img
                  src={resolveImageUrl(piece.image_path)}
                  alt=""
                  className="h-10 w-10 rounded-lg bg-stage object-contain"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{piece.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {CATEGORY_LABELS[piece.category]} · z {piece.layer_z}
                  </span>
                </span>
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onBringForward(piece.id)}
                  disabled={index === 0}
                  className="rounded-full border border-border px-2 py-1 text-xs font-semibold hover:border-accent disabled:opacity-40"
                  title="Bring forward"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onSendBackward(piece.id)}
                  disabled={index === frontToBack.length - 1}
                  className="rounded-full border border-border px-2 py-1 text-xs font-semibold hover:border-accent disabled:opacity-40"
                  title="Send backward"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onUnequip(piece.id)}
                  className="rounded-full border border-border px-2 py-1 text-xs font-semibold text-muted hover:border-accent"
                >
                  ×
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
