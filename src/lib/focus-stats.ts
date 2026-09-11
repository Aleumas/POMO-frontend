import type { SupabaseClient } from "@supabase/supabase-js";

export type FocusStats = {
  totalSessions: number;
  totalMinutes: number;
  sessionsThisWeek: number;
};

type FocusStatsRow = {
  total_sessions: number | string;
  total_minutes: number | string;
  sessions_this_week: number | string;
};

export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  // getDay(): Sunday = 0. Shift so Monday = 0.
  const daysSinceMonday = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - daysSinceMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

export async function fetchFocusStats(
  supabase: Pick<SupabaseClient, "rpc">,
  now: Date = new Date(),
): Promise<FocusStats> {
  const { data, error } = await supabase
    .rpc("get_focus_stats", { week_start: startOfWeek(now).toISOString() })
    .single();

  if (error) {
    throw error;
  }

  const row = data as FocusStatsRow;

  return {
    totalSessions: Number(row.total_sessions),
    totalMinutes: Number(row.total_minutes),
    sessionsThisWeek: Number(row.sessions_this_week),
  };
}
