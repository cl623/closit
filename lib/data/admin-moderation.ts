import type { ItemCategory } from "@/lib/items/categories";
import type { Report, ReportStatus } from "@/lib/outfits/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";
import { fetchIsAdmin } from "@/lib/data/admin";

export type AdminTopOutfit = {
  outfit_id: string;
  outfit_name: string;
  creator_id: string;
  creator_name: string | null;
  is_published: boolean;
  like_count: number;
};

export type AdminTopItem = {
  item_id: string;
  item_name: string;
  category: ItemCategory;
  owner_id: string | null;
  owner_name: string | null;
  is_system: boolean;
  like_count: number;
};

export type AdminReportRow = Report & {
  reporter_name: string | null;
  reported_user_name: string | null;
  item_name: string | null;
  outfit_name: string | null;
  outfit_is_published: boolean | null;
};

function requireAdminClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Admin tools require Supabase configuration.");
  }
  return createClient();
}

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function fetchAllReportsForAdmin(): Promise<AdminReportRow[]> {
  const isAdmin = await fetchIsAdmin();
  if (!isAdmin) {
    throw new Error("Admin access required.");
  }

  const supabase = requireAdminClient();
  const { data, error } = await supabase
    .from("reports")
    .select(
      `
      *,
      reporter:profiles!reports_reporter_id_fkey(display_name),
      reported_user:profiles!reports_reported_user_id_fkey(display_name),
      item:items(id, name),
      outfit:outfits(id, name, is_published)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const reporter = asSingle(row.reporter) as { display_name: string | null } | null;
    const reportedUser = asSingle(row.reported_user) as { display_name: string | null } | null;
    const item = asSingle(row.item) as { id: string; name: string } | null;
    const outfit = asSingle(row.outfit) as {
      id: string;
      name: string;
      is_published: boolean;
    } | null;

    return {
      id: row.id,
      reporter_id: row.reporter_id,
      target_type: row.target_type,
      item_id: row.item_id,
      outfit_id: row.outfit_id,
      reported_user_id: row.reported_user_id,
      reason: row.reason,
      notes: row.notes,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      reporter_name: reporter?.display_name ?? null,
      reported_user_name: reportedUser?.display_name ?? null,
      item_name: item?.name ?? null,
      outfit_name: outfit?.name ?? null,
      outfit_is_published: outfit?.is_published ?? null,
    } satisfies AdminReportRow;
  });
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
): Promise<Report> {
  const isAdmin = await fetchIsAdmin();
  if (!isAdmin) {
    throw new Error("Admin access required.");
  }

  const supabase = requireAdminClient();
  const { data, error } = await supabase
    .from("reports")
    .update({ status })
    .eq("id", reportId)
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("Failed to update report.");
  return data as Report;
}

export async function fetchAdminTopLikedOutfits(limit = 100): Promise<AdminTopOutfit[]> {
  const isAdmin = await fetchIsAdmin();
  if (!isAdmin) {
    throw new Error("Admin access required.");
  }

  const supabase = requireAdminClient();
  const { data, error } = await supabase.rpc("admin_top_liked_outfits", {
    p_limit: limit,
  });

  if (error) throw error;

  return (data ?? []).map((row: AdminTopOutfit) => ({
    ...row,
    like_count: Number(row.like_count),
  }));
}

export async function fetchAdminTopLikedItems(limit = 100): Promise<AdminTopItem[]> {
  const isAdmin = await fetchIsAdmin();
  if (!isAdmin) {
    throw new Error("Admin access required.");
  }

  const supabase = requireAdminClient();
  const { data, error } = await supabase.rpc("admin_top_liked_items", {
    p_limit: limit,
  });

  if (error) throw error;

  return (data ?? []).map((row: AdminTopItem) => ({
    ...row,
    like_count: Number(row.like_count),
  }));
}
