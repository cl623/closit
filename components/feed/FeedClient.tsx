"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FeedCard } from "@/components/feed/FeedCard";
import { fetchFeed } from "@/lib/data/social";
import { fetchTopOutfitsOfWeek } from "@/lib/data/leaderboards";
import type { FeedOutfit } from "@/lib/outfits/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function FeedClient() {
  const configured = isSupabaseConfigured();
  const [outfits, setOutfits] = useState<FeedOutfit[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (nextCursor: string | null, append: boolean) => {
    if (!configured) {
      setOutfits([]);
      setLoading(false);
      return;
    }

    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const [{ outfits: page, nextCursor: following }, topWeek] = await Promise.all([
        fetchFeed({ limit: 12, cursor: nextCursor }),
        append ? Promise.resolve([]) : fetchTopOutfitsOfWeek(10),
      ]);

      const rankById = new Map(topWeek.map((row) => [row.outfit_id, row.rank]));
      const withRanks = page.map((outfit) => ({
        ...outfit,
        week_rank: rankById.get(outfit.id) ?? null,
      }));

      setOutfits((prev) => (append ? [...prev, ...withRanks] : withRanks));
      setCursor(following);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feed");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [configured]);

  useEffect(() => {
    void loadPage(null, false);
  }, [loadPage]);

  if (!configured) {
    return (
      <div className="rounded-3xl border border-border bg-surface px-6 py-12 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Feed</h1>
        <p className="mt-3 text-muted">
          Configure Supabase to browse published outfits. The feed is not available in local-seed mode.
        </p>
        <Link href="/studio" className="mt-6 inline-block text-accent underline-offset-2 hover:underline">
          Open studio
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Feed</h1>
        <p className="text-sm text-muted">Published outfits from the community, newest first.</p>
      </div>

      {loading && <p className="text-muted">Loading feed…</p>}
      {error && <p className="text-sm text-accent">{error}</p>}

      {!loading && outfits.length === 0 && !error && (
        <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-sm text-muted">
          No published outfits yet.{" "}
          <Link href="/studio" className="text-accent underline-offset-2 hover:underline">
            Dress something up and publish
          </Link>
          .
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {outfits.map((outfit) => (
          <FeedCard key={outfit.id} outfit={outfit} />
        ))}
      </div>

      {cursor && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void loadPage(cursor, true)}
            disabled={loadingMore}
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold hover:border-accent disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
