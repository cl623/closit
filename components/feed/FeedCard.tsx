"use client";

import Link from "next/link";
import { AvatarStage } from "@/components/studio/AvatarStage";
import type { FeedOutfit } from "@/lib/outfits/types";

type FeedCardProps = {
  outfit: FeedOutfit;
};

export function FeedCard({ outfit }: FeedCardProps) {
  const creatorLabel = outfit.creator.display_name?.trim() || "Anonymous";

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-surface">
      <Link href={`/o/${outfit.id}`} className="block">
        <AvatarStage
          avatar={outfit.avatar}
          equippedItems={outfit.items}
          className="w-full rounded-none border-0"
        />
      </Link>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/o/${outfit.id}`}
              className="font-[family-name:var(--font-display)] text-xl hover:text-accent"
            >
              {outfit.name}
            </Link>
            <p className="text-sm text-muted">
              by{" "}
              <Link
                href={`/u/${outfit.creator.id}`}
                className="underline-offset-2 hover:text-accent hover:underline"
              >
                {creatorLabel}
              </Link>
            </p>
          </div>
          {typeof outfit.week_rank === "number" && outfit.week_rank > 0 && (
            <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-muted">
              #{outfit.week_rank} this week
            </span>
          )}
        </div>
        <p className="text-sm text-muted">{outfit.like_count} outfit like{outfit.like_count === 1 ? "" : "s"}</p>
      </div>
    </article>
  );
}
