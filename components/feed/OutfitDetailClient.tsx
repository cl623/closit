"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OutfitDetail } from "@/components/feed/OutfitDetail";
import { fetchPublishedOutfit } from "@/lib/data/social";
import type { FeedOutfit } from "@/lib/outfits/types";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type OutfitDetailClientProps = {
  outfitId: string;
};

export function OutfitDetailClient({ outfitId }: OutfitDetailClientProps) {
  const configured = isSupabaseConfigured();
  const [outfit, setOutfit] = useState<FeedOutfit | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!configured) {
        if (!cancelled) {
          setMissing(true);
          setLoading(false);
        }
        return;
      }

      const supabase = createClient();
      const [{ data: auth }, published] = await Promise.all([
        supabase.auth.getUser(),
        fetchPublishedOutfit(outfitId),
      ]);

      if (cancelled) return;

      setSignedIn(Boolean(auth.user));
      if (!published) {
        setMissing(true);
      } else {
        setOutfit(published);
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [configured, outfitId]);

  if (loading) {
    return <p className="text-muted">Loading outfit…</p>;
  }

  if (missing || !outfit) {
    return (
      <div className="rounded-3xl border border-border bg-surface px-6 py-12 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Outfit not found</h1>
        <p className="mt-3 text-muted">This board is unpublished or does not exist.</p>
        <Link href="/feed" className="mt-6 inline-block text-accent underline-offset-2 hover:underline">
          Back to feed
        </Link>
      </div>
    );
  }

  return <OutfitDetail outfit={outfit} signedIn={signedIn} />;
}
