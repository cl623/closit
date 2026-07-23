"use client";

import Link from "next/link";
import { AvatarStage } from "@/components/studio/AvatarStage";
import type { LeaderboardCreatorRow, LeaderboardOutfitRow } from "@/lib/outfits/types";

type LeaderboardSectionsProps = {
  outfits: LeaderboardOutfitRow[];
  creators: LeaderboardCreatorRow[];
  configured: boolean;
};

export function LeaderboardSections({
  outfits,
  creators,
  configured,
}: LeaderboardSectionsProps) {
  if (!configured) {
    return (
      <div className="rounded-3xl border border-border bg-surface px-6 py-12 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Leaderboards</h1>
        <p className="mt-3 text-muted">
          Configure Supabase to see weekly rankings. Leaderboards are not available in local-seed mode.
        </p>
        <Link href="/studio" className="mt-6 inline-block text-accent underline-offset-2 hover:underline">
          Open studio
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Leaderboards</h1>
        <p className="text-sm text-muted">Weekly ranks from outfit likes (and item saves as a creator tie-break).</p>
      </div>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Top 10 outfits of the week</h2>
        {outfits.length === 0 ? (
          <p className="text-sm text-muted">No outfit likes in the last 7 days yet.</p>
        ) : (
          <ol className="grid gap-4 sm:grid-cols-2">
            {outfits.map((row) => (
              <li key={row.outfit_id} className="overflow-hidden rounded-3xl border border-border bg-surface">
                <Link href={`/o/${row.outfit_id}`} className="block">
                  <AvatarStage
                    avatar={row.avatar}
                    equippedItems={row.items}
                    className="w-full rounded-none border-0"
                  />
                </Link>
                <div className="min-w-0 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    #{row.rank}
                  </p>
                  <Link
                    href={`/o/${row.outfit_id}`}
                    className="font-[family-name:var(--font-display)] text-xl hover:text-accent"
                  >
                    {row.outfit_name}
                  </Link>
                  <p className="text-sm text-muted">
                    by {row.creator_name?.trim() || "Anonymous"} · {row.like_count} like
                    {row.like_count === 1 ? "" : "s"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Top creators</h2>
        {creators.length === 0 ? (
          <p className="text-sm text-muted">No creator engagement in the last 7 days yet.</p>
        ) : (
          <ol className="space-y-2">
            {creators.map((row) => (
              <li
                key={row.creator_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
              >
                <div>
                  <p className="font-semibold">
                    <span className="mr-2 text-muted">#{row.rank}</span>
                    {row.creator_name?.trim() || "Anonymous"}
                  </p>
                </div>
                <p className="text-sm text-muted">
                  {row.outfit_like_count} outfit like{row.outfit_like_count === 1 ? "" : "s"}
                  <span className="mx-2">·</span>
                  {row.item_save_count} item save{row.item_save_count === 1 ? "" : "s"}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
