import type { Report, ReportTargetType } from "@/lib/outfits/types";
import { REPORT_REASONS } from "@/lib/outfits/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

export type CreateReportInput = {
  targetType: ReportTargetType;
  itemId?: string | null;
  outfitId?: string | null;
  reportedUserId?: string | null;
  reason: (typeof REPORT_REASONS)[number] | string;
  notes?: string;
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Reporting requires Supabase configuration.");
  }
  return createClient();
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  const supabase = requireSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const reporterId = auth.user?.id;
  if (!reporterId) throw new Error("Sign in to submit a report.");

  if (input.targetType === "item" && !input.itemId) {
    throw new Error("Item id is required.");
  }
  if (input.targetType === "outfit" && !input.outfitId) {
    throw new Error("Outfit id is required.");
  }

  const { data, error } = await supabase
    .from("reports")
    .insert({
      reporter_id: reporterId,
      target_type: input.targetType,
      item_id: input.targetType === "item" ? input.itemId : null,
      outfit_id: input.targetType === "outfit" ? input.outfitId : null,
      reported_user_id: input.reportedUserId ?? null,
      reason: input.reason.trim(),
      notes: (input.notes ?? "").trim(),
      status: "open",
    })
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("Failed to submit report.");
  return data as Report;
}

export async function fetchMyReports(): Promise<Report[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("reporter_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Failed to fetch reports", error.message);
    return [];
  }

  return (data ?? []) as Report[];
}
