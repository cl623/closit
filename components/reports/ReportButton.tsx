"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createReport } from "@/lib/data/reports";
import { REPORT_REASONS, type ReportTargetType } from "@/lib/outfits/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type ReportButtonProps = {
  targetType: ReportTargetType;
  itemId?: string | null;
  outfitId?: string | null;
  reportedUserId?: string | null;
  signedIn: boolean;
  label?: string;
};

export function ReportButton({
  targetType,
  itemId,
  outfitId,
  reportedUserId,
  signedIn,
  label = "Report",
}: ReportButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>(REPORT_REASONS[0]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function start() {
    if (!isSupabaseConfigured()) {
      setMessage("Reporting requires Supabase.");
      return;
    }
    if (!signedIn) {
      router.push("/login");
      return;
    }
    setOpen(true);
    setMessage(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await createReport({
        targetType,
        itemId,
        outfitId,
        reportedUserId,
        reason,
        notes,
      });
      setMessage("Report submitted. Thanks for helping keep clos.it safe.");
      setOpen(false);
      setNotes("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={start}
        className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted hover:border-accent hover:text-foreground"
      >
        {label}
      </button>
      {message && <p className="text-xs text-muted">{message}</p>}
      {open && (
        <form
          onSubmit={submit}
          className="space-y-3 rounded-2xl border border-border bg-surface p-3 text-sm"
        >
          <label className="block">
            <span className="mb-1 block text-muted">Reason</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as (typeof REPORT_REASONS)[number])}
              className="w-full rounded-xl border border-border bg-background px-3 py-2"
            >
              {REPORT_REASONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-muted">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-3 py-2"
              placeholder="Anything moderators should know…"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent-deep disabled:opacity-50"
            >
              {busy ? "Sending…" : "Submit report"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
