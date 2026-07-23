"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchAdminTopLikedItems,
  fetchAdminTopLikedOutfits,
  fetchAllReportsForAdmin,
  updateReportStatus,
  type AdminReportRow,
  type AdminTopItem,
  type AdminTopOutfit,
} from "@/lib/data/admin-moderation";
import {
  fetchAnalyticsBundle,
  type AnalyticsBundle,
  type AnalyticsWindow,
} from "@/lib/data/analytics";
import { adminDeleteItem, adminDisableAccount } from "@/lib/data/profiles";
import { fetchIsAdmin } from "@/lib/data/admin";
import type { ReportStatus } from "@/lib/outfits/types";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Tab = "reports" | "analytics" | "outfits" | "items";

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

export function AdminClient() {
  const configured = isSupabaseConfigured();
  const [tab, setTab] = useState<Tab>("reports");
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<AdminReportRow[]>([]);
  const [topOutfits, setTopOutfits] = useState<AdminTopOutfit[]>([]);
  const [topItems, setTopItems] = useState<AdminTopItem[]>([]);
  const [analyticsDays, setAnalyticsDays] = useState<AnalyticsWindow>(7);
  const [analytics, setAnalytics] = useState<AnalyticsBundle | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!configured) {
        if (!cancelled) setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!data.user) {
        setSignedIn(false);
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setSignedIn(true);
      const admin = await fetchIsAdmin();
      if (cancelled) return;

      if (!admin) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);
      try {
        const [nextReports, nextOutfits, nextItems, nextAnalytics] = await Promise.all([
          fetchAllReportsForAdmin(),
          fetchAdminTopLikedOutfits(100),
          fetchAdminTopLikedItems(100),
          fetchAnalyticsBundle(7),
        ]);
        if (cancelled) return;
        setReports(nextReports);
        setTopOutfits(nextOutfits);
        setTopItems(nextItems);
        setAnalytics(nextAnalytics);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load admin data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [configured]);

  async function onStatusChange(reportId: string, status: ReportStatus) {
    setUpdatingId(reportId);
    setError(null);
    try {
      const updated = await updateReportStatus(reportId, status);
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, ...updated } : r)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  async function onAnalyticsWindow(days: AnalyticsWindow) {
    setAnalyticsDays(days);
    setError(null);
    try {
      setAnalytics(await fetchAnalyticsBundle(days));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    }
  }

  async function onDeleteReportedItem(itemId: string, name: string) {
    if (!window.confirm(`Delete reported item “${name}”?`)) return;
    setBusy(true);
    setError(null);
    try {
      await adminDeleteItem(itemId);
      setReports(await fetchAllReportsForAdmin());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setBusy(false);
    }
  }

  async function onDisableReportedUser(userId: string, label: string) {
    if (!window.confirm(`Disable account for ${label}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await adminDisableAccount(userId);
      setReports(await fetchAllReportsForAdmin());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable account");
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Admin</h1>
        <p className="mt-3 text-muted">Configure Supabase to use moderation tools.</p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-muted">Loading admin…</p>;
  }

  if (!signedIn) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Admin</h1>
        <p className="mt-3 text-muted">
          <Link href="/login" className="text-accent underline-offset-2 hover:underline">
            Sign in
          </Link>{" "}
          with an administrator account.
        </p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Admin</h1>
        <p className="mt-3 text-muted">
          This area is restricted. Normal users can only view reports they submitted at{" "}
          <Link href="/reports" className="text-accent underline-offset-2 hover:underline">
            /reports
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Admin</h1>
        <p className="text-sm text-muted">
          Moderate reports, review trend analytics, and inspect top liked content.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["reports", "Reports review"],
            ["analytics", "Trend analytics"],
            ["outfits", "Top liked outfits"],
            ["items", "Top liked items"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === id
                ? "bg-accent text-white"
                : "border border-border text-muted hover:border-accent hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {tab === "reports" && (
        <section className="space-y-3">
          {reports.length === 0 ? (
            <p className="rounded-2xl border border-border bg-surface px-4 py-8 text-center text-muted">
              No reports yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {reports.map((report) => (
                <li
                  key={report.id}
                  className="rounded-2xl border border-border bg-surface p-4 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="font-semibold capitalize">
                        {report.target_type} · {report.reason}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted">
                        <span>
                          Reporter:{" "}
                          <Link
                            href={`/u/${report.reporter_id}`}
                            className="text-accent underline-offset-2 hover:underline"
                          >
                            {report.reporter_name?.trim() || report.reporter_id.slice(0, 8)}
                          </Link>
                        </span>
                        {report.reported_user_id && (
                          <span>
                            Reported account:{" "}
                            <Link
                              href={`/u/${report.reported_user_id}`}
                              className="text-accent underline-offset-2 hover:underline"
                            >
                              {report.reported_user_name?.trim() ||
                                report.reported_user_id.slice(0, 8)}
                            </Link>
                          </span>
                        )}
                      </div>
                      {report.outfit_id && (
                        <p>
                          Outfit:{" "}
                          {report.outfit_is_published ? (
                            <Link
                              href={`/o/${report.outfit_id}`}
                              className="text-accent underline-offset-2 hover:underline"
                            >
                              {report.outfit_name || report.outfit_id.slice(0, 8)}
                            </Link>
                          ) : (
                            <span>
                              {report.outfit_name || report.outfit_id.slice(0, 8)} (unpublished)
                            </span>
                          )}
                        </p>
                      )}
                      {report.item_id && (
                        <p>
                          Item:{" "}
                          <span className="font-medium text-foreground">
                            {report.item_name || report.item_id.slice(0, 8)}
                          </span>
                          {report.reported_user_id && (
                            <>
                              {" "}
                              · owner profile{" "}
                              <Link
                                href={`/u/${report.reported_user_id}`}
                                className="text-accent underline-offset-2 hover:underline"
                              >
                                open
                              </Link>
                            </>
                          )}
                        </p>
                      )}
                      {report.notes && <p className="text-muted">Notes: {report.notes}</p>}
                      <p className="text-xs text-muted">
                        {new Date(report.created_at).toLocaleString()}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {report.item_id && report.item_name && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void onDeleteReportedItem(report.item_id!, report.item_name!)
                            }
                            className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Delete item
                          </button>
                        )}
                        {report.reported_user_id && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void onDisableReportedUser(
                                report.reported_user_id!,
                                report.reported_user_name?.trim() || "this user",
                              )
                            }
                            className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Disable account
                          </button>
                        )}
                      </div>
                    </div>
                    <label className="block text-xs">
                      <span className="mb-1 block text-muted">Status</span>
                      <select
                        value={report.status}
                        disabled={updatingId === report.id}
                        onChange={(e) =>
                          void onStatusChange(report.id, e.target.value as ReportStatus)
                        }
                        className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                      >
                        <option value="open">{statusLabel("open")}</option>
                        <option value="resolved">{statusLabel("resolved")}</option>
                        <option value="dismissed">{statusLabel("dismissed")}</option>
                      </select>
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "analytics" && analytics && (
        <section className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {([7, 30] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => void onAnalyticsWindow(days)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  analyticsDays === days
                    ? "bg-accent text-white"
                    : "border border-border text-muted hover:border-accent"
                }`}
              >
                Last {days} days
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-border bg-surface p-4">
              <h2 className="font-[family-name:var(--font-display)] text-xl">Trending colors</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {analytics.colors.map((row) => (
                  <li key={row.label} className="flex justify-between gap-3">
                    <span className="capitalize">{row.label}</span>
                    <span className="text-muted">{row.engagement_count} likes</span>
                  </li>
                ))}
                {analytics.colors.length === 0 && (
                  <li className="text-muted">No color engagement in this window.</li>
                )}
              </ul>
            </div>
            <div className="rounded-3xl border border-border bg-surface p-4">
              <h2 className="font-[family-name:var(--font-display)] text-xl">Trending styles</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {analytics.styles.map((row) => (
                  <li key={row.label} className="flex justify-between gap-3">
                    <span className="capitalize">{row.label}</span>
                    <span className="text-muted">{row.engagement_count} likes</span>
                  </li>
                ))}
                {analytics.styles.length === 0 && (
                  <li className="text-muted">No style engagement in this window.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-4">
            <h2 className="font-[family-name:var(--font-display)] text-xl">
              Trending item combinations
            </h2>
            <p className="mt-1 text-xs text-muted">
              Pairs that co-occur in outfits liked during the selected window, weighted by likes.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {analytics.combinations.map((row) => (
                <li
                  key={`${row.item_a_id}-${row.item_b_id}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 py-2 last:border-0"
                >
                  <span>
                    {row.item_a_name} <span className="text-muted">+</span> {row.item_b_name}
                  </span>
                  <span className="text-muted">
                    {row.pair_count} outfits · weight {row.like_weight}
                  </span>
                </li>
              ))}
              {analytics.combinations.length === 0 && (
                <li className="text-muted">No combinations in this window.</li>
              )}
            </ul>
          </div>
        </section>
      )}

      {tab === "outfits" && (
        <section className="overflow-x-auto rounded-3xl border border-border bg-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Outfit</th>
                <th className="px-4 py-3 font-medium">Creator</th>
                <th className="px-4 py-3 font-medium">Likes</th>
                <th className="px-4 py-3 font-medium">Published</th>
              </tr>
            </thead>
            <tbody>
              {topOutfits.map((row, index) => (
                <tr key={row.outfit_id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3 text-muted">{index + 1}</td>
                  <td className="px-4 py-3">
                    {row.is_published ? (
                      <Link
                        href={`/o/${row.outfit_id}`}
                        className="font-medium text-accent underline-offset-2 hover:underline"
                      >
                        {row.outfit_name}
                      </Link>
                    ) : (
                      <span className="font-medium">{row.outfit_name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/u/${row.creator_id}`}
                      className="text-accent underline-offset-2 hover:underline"
                    >
                      {row.creator_name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-semibold">{row.like_count}</td>
                  <td className="px-4 py-3 text-muted">{row.is_published ? "Yes" : "No"}</td>
                </tr>
              ))}
              {topOutfits.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No liked outfits yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {tab === "items" && (
        <section className="overflow-x-auto rounded-3xl border border-border bg-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Likes</th>
              </tr>
            </thead>
            <tbody>
              {topItems.map((row, index) => (
                <tr key={row.item_id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3 text-muted">{index + 1}</td>
                  <td className="px-4 py-3 font-medium">
                    {row.item_name}
                    {row.is_system ? (
                      <span className="ml-2 text-xs text-muted">(system)</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 capitalize text-muted">{row.category}</td>
                  <td className="px-4 py-3">
                    {row.owner_id ? (
                      <Link
                        href={`/u/${row.owner_id}`}
                        className="text-accent underline-offset-2 hover:underline"
                      >
                        {row.owner_name ?? "—"}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold">{row.like_count}</td>
                </tr>
              ))}
              {topItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No liked items yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
