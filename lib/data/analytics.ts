import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";
import { fetchIsAdmin } from "@/lib/data/admin";

export type TrendingTagRow = {
  label: string;
  engagement_count: number;
};

export type TrendingCombinationRow = {
  item_a_id: string;
  item_a_name: string;
  item_b_id: string;
  item_b_name: string;
  pair_count: number;
  like_weight: number;
};

export type AnalyticsWindow = 7 | 30;

export type AnalyticsBundle = {
  days: AnalyticsWindow;
  colors: TrendingTagRow[];
  styles: TrendingTagRow[];
  combinations: TrendingCombinationRow[];
};

async function requireAdmin() {
  if (!isSupabaseConfigured()) {
    throw new Error("Analytics require Supabase configuration.");
  }
  if (!(await fetchIsAdmin())) {
    throw new Error("Admin access required.");
  }
  return createClient();
}

export async function fetchAnalyticsBundle(days: AnalyticsWindow): Promise<AnalyticsBundle> {
  const supabase = await requireAdmin();

  const [colorsRes, stylesRes, combosRes] = await Promise.all([
    supabase.rpc("admin_trending_colors", { p_days: days }),
    supabase.rpc("admin_trending_styles", { p_days: days }),
    supabase.rpc("admin_trending_combinations", { p_days: days }),
  ]);

  if (colorsRes.error) throw colorsRes.error;
  if (stylesRes.error) throw stylesRes.error;
  if (combosRes.error) throw combosRes.error;

  return {
    days,
    colors: (colorsRes.data ?? []).map((row: { color: string; engagement_count: number }) => ({
      label: row.color,
      engagement_count: Number(row.engagement_count),
    })),
    styles: (stylesRes.data ?? []).map((row: { style: string; engagement_count: number }) => ({
      label: row.style,
      engagement_count: Number(row.engagement_count),
    })),
    combinations: (combosRes.data ?? []).map(
      (row: {
        item_a_id: string;
        item_a_name: string;
        item_b_id: string;
        item_b_name: string;
        pair_count: number;
        like_weight: number;
      }) => ({
        ...row,
        pair_count: Number(row.pair_count),
        like_weight: Number(row.like_weight),
      }),
    ),
  };
}
