"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchMyReports } from "@/lib/data/reports";
import type { Report, ReportStatus } from "@/lib/outfits/types";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function statusLabel(status: ReportStatus): string {
  switch (status) {
    case "open":
      return "Open";
    case "resolved":
      return "Resolved";
    case "dismissed":
      return "Dismissed";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function MyReportsClient() {
  const configured = isSupabaseConfigured();
  const [reports, setReports] = useState<Report[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!configured) {
        if (!cancelled) setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!data.user) {
        setSignedIn(false);
        setLoading(false);
        return;
      }

      setSignedIn(true);
      const rows = await fetchMyReports();
      if (!cancelled) {
        setReports(rows);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [configured]);

  if (!configured) {
    return (
      <div className="rounded-3xl border border-border bg-surface px-6 py-12 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">My reports</h1>
        <p className="mt-3 text-muted">Configure Supabase to use reporting.</p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-muted">Loading reports…</p>;
  }

  if (!signedIn) {
    return (
      <div className="rounded-3xl border border-border bg-surface px-6 py-12 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">My reports</h1>
        <p className="mt-3 text-muted">
          <Link href="/login" className="text-accent underline-offset-2 hover:underline">
            Sign in
          </Link>{" "}
          to view reports you have submitted.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">My reports</h1>
        <p className="text-sm text-muted">
          Only reports you filed. The full moderation queue is admin-only.
        </p>
      </div>

      {reports.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-sm text-muted">
          No reports yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li
              key={report.id}
              className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {report.target_type === "item" ? "Item" : "Outfit"} · {report.reason}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(report.created_at).toLocaleString()}
                    {report.outfit_id ? (
                      <>
                        {" · "}
                        <Link
                          href={`/o/${report.outfit_id}`}
                          className="text-accent underline-offset-2 hover:underline"
                        >
                          View outfit
                        </Link>
                      </>
                    ) : null}
                  </p>
                  {report.notes && <p className="mt-2 text-muted">{report.notes}</p>}
                </div>
                <span className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold">
                  {statusLabel(report.status)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
