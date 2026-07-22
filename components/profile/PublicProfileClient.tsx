"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AvatarStage } from "@/components/studio/AvatarStage";
import {
  adminDeleteItem,
  adminDisableAccount,
  fetchPublicProfile,
  type PublicProfile,
} from "@/lib/data/profiles";
import { fetchIsAdmin } from "@/lib/data/admin";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type PublicProfileClientProps = {
  userId: string;
};

export function PublicProfileClient({ userId }: PublicProfileClientProps) {
  const configured = isSupabaseConfigured();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const next = await fetchPublicProfile(userId);
    setProfile(next);
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!configured) {
        if (!cancelled) setLoading(false);
        return;
      }

      const supabase = createClient();
      await supabase.auth.getUser();
      const admin = await fetchIsAdmin();
      if (cancelled) return;
      setIsAdmin(admin);

      try {
        const next = await fetchPublicProfile(userId);
        if (!cancelled) setProfile(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load profile");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [configured, userId]);

  async function onDeleteItem(itemId: string, name: string) {
    if (!window.confirm(`Delete item “${name}” permanently?`)) return;
    setBusy(true);
    setError(null);
    try {
      await adminDeleteItem(itemId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setBusy(false);
    }
  }

  async function onDisableAccount() {
    if (
      !window.confirm(
        "Disable this account? Their outfits and uploaded items will be removed from the community.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminDisableAccount(userId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable account");
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Profile</h1>
        <p className="mt-3 text-muted">Configure Supabase to view public profiles.</p>
      </div>
    );
  }

  if (loading) return <p className="text-muted">Loading profile…</p>;

  if (!profile) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Profile</h1>
        <p className="mt-3 text-muted">This profile is unavailable.</p>
        <Link href="/feed" className="mt-4 inline-block text-accent underline-offset-2 hover:underline">
          Back to feed
        </Link>
      </div>
    );
  }

  const name = profile.display_name?.trim() || "Anonymous";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">{name}</h1>
          <p className="text-sm text-muted">
            Joined {new Date(profile.created_at).toLocaleDateString()}
            {profile.disabled_at ? " · Account disabled" : ""}
          </p>
        </div>
        {isAdmin && !profile.disabled_at && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDisableAccount()}
            className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Disable account
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Badges</h2>
        {profile.badges.length === 0 ? (
          <p className="text-sm text-muted">No badges yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {profile.badges.map((badge) => (
              <li
                key={`${badge.badge_id}-${badge.period_key}`}
                className="rounded-2xl border border-border bg-surface px-3 py-2"
                title={badge.description}
              >
                <p className="text-sm font-semibold">{badge.name}</p>
                <p className="text-xs text-muted">{badge.period_key}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Published outfits</h2>
        {profile.publishedOutfits.length === 0 ? (
          <p className="text-sm text-muted">No published outfits yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {profile.publishedOutfits.map((outfit) => (
              <article
                key={outfit.id}
                className="overflow-hidden rounded-3xl border border-border bg-surface"
              >
                <Link href={`/o/${outfit.id}`} className="block">
                  <AvatarStage
                    avatar={outfit.avatar}
                    equippedItems={outfit.items}
                    className="w-full rounded-none border-0"
                  />
                </Link>
                <div className="p-4">
                  <Link
                    href={`/o/${outfit.id}`}
                    className="font-[family-name:var(--font-display)] text-xl hover:text-accent"
                  >
                    {outfit.name}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Uploaded items</h2>
        {profile.items.length === 0 ? (
          <p className="text-sm text-muted">No uploaded items yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {profile.items.map((item) => (
              <li key={item.id} className="relative rounded-2xl border border-border bg-surface p-3">
                <div className="mb-2 flex h-24 items-center justify-center rounded-xl bg-stage">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image_url} alt="" className="max-h-20 max-w-[80%] object-contain" />
                </div>
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="truncate text-xs text-muted">
                  {item.color}
                  {item.style ? ` · ${item.style}` : ""}
                </p>
                {isAdmin && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onDeleteItem(item.id, item.name)}
                    className="mt-2 text-xs font-semibold text-red-700 hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
