"use client";

import { useEffect, useState } from "react";
import { LeaderboardSections } from "@/components/leaderboards/LeaderboardSections";
import { fetchTopCreators, fetchTopOutfitsOfWeek } from "@/lib/data/leaderboards";
import type { LeaderboardCreatorRow, LeaderboardOutfitRow } from "@/lib/outfits/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function LeaderboardsClient() {
  const configured = isSupabaseConfigured();
  const [outfits, setOutfits] = useState<LeaderboardOutfitRow[]>([]);
  const [creators, setCreators] = useState<LeaderboardCreatorRow[]>([]);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) return;

    let cancelled = false;
    async function load() {
      const [nextOutfits, nextCreators] = await Promise.all([
        fetchTopOutfitsOfWeek(10),
        fetchTopCreators(10),
      ]);
      if (cancelled) return;
      setOutfits(nextOutfits);
      setCreators(nextCreators);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [configured]);

  if (loading) {
    return <p className="text-muted">Loading leaderboards…</p>;
  }

  return (
    <LeaderboardSections outfits={outfits} creators={creators} configured={configured} />
  );
}
