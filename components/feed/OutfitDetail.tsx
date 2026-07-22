"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ItemEngagementButtons,
  OutfitLikeButton,
} from "@/components/feed/EngagementButtons";
import { ReportButton } from "@/components/reports/ReportButton";
import { AvatarStage } from "@/components/studio/AvatarStage";
import { resolveImageUrl } from "@/lib/items/image-url";
import type { FeedOutfit, ItemEngagement } from "@/lib/outfits/types";

type OutfitDetailProps = {
  outfit: FeedOutfit;
  signedIn: boolean;
};

export function OutfitDetail({ outfit, signedIn }: OutfitDetailProps) {
  const [likeCount, setLikeCount] = useState(outfit.like_count);
  const [liked, setLiked] = useState(outfit.liked_by_viewer);
  const [engagementById, setEngagementById] = useState<Record<string, ItemEngagement>>(() => {
    const map: Record<string, ItemEngagement> = {};
    for (const row of outfit.item_engagement) {
      map[row.item_id] = row;
    }
    return map;
  });

  const creatorLabel = outfit.creator.display_name?.trim() || "Anonymous";
  const sortedItems = [...outfit.items].sort((a, b) => a.layer_z - b.layer_z);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            <Link href="/feed" className="hover:text-accent">
              Feed
            </Link>
            <span className="mx-2">/</span>
            Outfit
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">{outfit.name}</h1>
          <p className="text-sm text-muted">by {creatorLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OutfitLikeButton
            outfitId={outfit.id}
            liked={liked}
            likeCount={likeCount}
            signedIn={signedIn}
            onChange={(next) => {
              setLiked(next.liked);
              setLikeCount(next.like_count);
            }}
          />
          <ReportButton
            targetType="outfit"
            outfitId={outfit.id}
            reportedUserId={outfit.user_id}
            signedIn={signedIn}
            label="Report outfit"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,420px)_1fr]">
        <AvatarStage avatar={outfit.avatar} equippedItems={outfit.items} className="w-full" />

        <div className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Pieces</h2>
          {sortedItems.length === 0 ? (
            <p className="text-sm text-muted">No items on this board.</p>
          ) : (
            <ul className="space-y-3">
              {sortedItems.map((item) => {
                const engagement = engagementById[item.id] ?? {
                  item_id: item.id,
                  like_count: 0,
                  save_count: 0,
                  liked_by_viewer: false,
                  saved_by_viewer: false,
                };

                return (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-3"
                  >
                    <img
                      src={resolveImageUrl(item.image_path)}
                      alt={item.name}
                      className="h-14 w-14 rounded-xl bg-stage object-contain"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs capitalize text-muted">
                        {item.category}
                        {item.color ? ` · ${item.color}` : ""}
                        {item.style ? ` · ${item.style}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <ItemEngagementButtons
                        itemId={item.id}
                        liked={engagement.liked_by_viewer}
                        likeCount={engagement.like_count}
                        saved={engagement.saved_by_viewer}
                        saveCount={engagement.save_count}
                        signedIn={signedIn}
                        onLikeChange={(next) => {
                          setEngagementById((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...engagement,
                              liked_by_viewer: next.liked,
                              like_count: next.like_count,
                            },
                          }));
                        }}
                        onSaveChange={(next) => {
                          setEngagementById((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...engagement,
                              saved_by_viewer: next.saved,
                              save_count: next.save_count,
                            },
                          }));
                        }}
                      />
                      <ReportButton
                        targetType="item"
                        itemId={item.id}
                        reportedUserId={item.owner_id}
                        signedIn={signedIn}
                        label="Report item"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
