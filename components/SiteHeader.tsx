"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) return;

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, [configured]);

  async function signOut() {
    if (!configured) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    setEmail(null);
  }

  return (
    <header className="border-b border-border/80 bg-surface/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
          clos.it
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-3 text-sm font-medium text-muted sm:gap-4">
          <Link href="/feed" className="hover:text-foreground">
            Feed
          </Link>
          <Link href="/studio" className="hover:text-foreground">
            Studio
          </Link>
          <Link href="/outfits" className="hover:text-foreground">
            Outfits
          </Link>
          <Link href="/leaderboards" className="hover:text-foreground">
            Leaderboards
          </Link>
          <Link href="/upload" className="hover:text-foreground">
            Upload
          </Link>
          {email ? (
            <>
              <Link href="/reports" className="hover:text-foreground">
                Reports
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="rounded-full border border-border px-3 py-1.5 text-foreground hover:border-accent"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-accent px-3 py-1.5 text-white hover:bg-accent-deep"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
