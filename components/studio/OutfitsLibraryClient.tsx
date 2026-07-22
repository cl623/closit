"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteOutfit, fetchUserOutfits } from "@/lib/data/catalog";
import { resolveImageUrl } from "@/lib/items/image-url";
import type { OutfitSummary } from "@/lib/outfits/types";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function OutfitsLibraryClient() {
  const configured = isSupabaseConfigured();
  const [outfits, setOutfits] = useState<OutfitSummary[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!configured) {
        if (!cancelled) setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (cancelled) return;

      setUserId(uid);
      if (!uid) {
        setLoading(false);
        return;
      }

      const list = await fetchUserOutfits(uid);
      if (!cancelled) {
        setOutfits(list);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [configured]);

  async function handleDelete(outfit: OutfitSummary) {
    if (!userId) return;
    const confirmed = window.confirm(`Delete “${outfit.name}”? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteOutfit(outfit.id, userId);
      setOutfits((prev) => prev.filter((o) => o.id !== outfit.id));
      setStatus(`Deleted ${outfit.name}.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to delete outfit");
    }
  }

  if (!configured) {
    return (
      <div className="rounded-3xl border border-border bg-surface px-6 py-12 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">My outfits</h1>
        <p className="mt-3 text-muted">Configure Supabase to save and browse outfits.</p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-muted">Loading outfits…</p>;
  }

  if (!userId) {
    return (
      <div className="rounded-3xl border border-border bg-surface px-6 py-12 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">My outfits</h1>
        <p className="mt-3 text-muted">
          <Link href="/login" className="text-accent underline-offset-2 hover:underline">
            Sign in
          </Link>{" "}
          to view saved drafts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">My outfits</h1>
          <p className="text-sm text-muted">Open a draft to edit, publish, or continue dressing.</p>
        </div>
        <Link
          href="/studio"
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep"
        >
          New outfit
        </Link>
      </div>

      {status && <p className="text-sm text-muted">{status}</p>}

      {outfits.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-sm text-muted">
          No saved outfits yet.{" "}
          <Link href="/studio" className="text-accent underline-offset-2 hover:underline">
            Open the studio
          </Link>{" "}
          and save a draft.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {outfits.map((outfit) => (
            <li
              key={outfit.id}
              className="overflow-hidden rounded-3xl border border-border bg-surface"
            >
              <Link href={`/studio/${outfit.id}`} className="block">
                <div className="flex aspect-[2/3] items-center justify-center bg-stage p-6">
                  <img
                    src={resolveImageUrl(outfit.avatar.image_path)}
                    alt=""
                    className="max-h-full max-w-full object-contain opacity-90"
                  />
                </div>
              </Link>
              <div className="space-y-3 p-4">
                <div>
                  <Link
                    href={`/studio/${outfit.id}`}
                    className="font-[family-name:var(--font-display)] text-xl hover:text-accent"
                  >
                    {outfit.name}
                  </Link>
                  <p className="text-xs text-muted">
                    {outfit.item_count} piece{outfit.item_count === 1 ? "" : "s"}
                    <span className="mx-1">·</span>
                    {outfit.is_published ? "Published" : "Draft"}
                    <span className="mx-1">·</span>
                    Updated {new Date(outfit.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/studio/${outfit.id}`}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-accent"
                  >
                    Edit
                  </Link>
                  {outfit.is_published && (
                    <Link
                      href={`/o/${outfit.id}`}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-accent"
                    >
                      View live
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDelete(outfit)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-red-700 hover:border-red-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
