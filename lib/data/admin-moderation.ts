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

function requireAdminClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Admin tools require Supabase configuration.");
  }
  return createClient();
}

export async function fetchAllReportsForAdmin(): Promise<Report[]> {
  const isAdmin = await fetchIsAdmin();
  if (!isAdmin) {
    throw new Error("Admin access required.");
  }

  const supabase = requireAdminClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Report[];
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
