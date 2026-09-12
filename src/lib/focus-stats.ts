export type FocusStats = {
  totalSessions: number;
  totalMinutes: number;
  sessionsThisWeek: number;
};

type FocusRow = { duration_seconds: number; completed_at: string };

export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  // getDay(): Sunday = 0. Shift so Monday = 0.
  const daysSinceMonday = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - daysSinceMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function computeFocusStats(rows: FocusRow[], weekStart: Date): FocusStats {
  const weekStartMs = weekStart.getTime();
  let totalSeconds = 0;
  let sessionsThisWeek = 0;
  for (const row of rows) {
    totalSeconds += row.duration_seconds;
    if (new Date(row.completed_at).getTime() >= weekStartMs) sessionsThisWeek += 1;
  }
  return {
    totalSessions: rows.length,
    totalMinutes: Math.floor(totalSeconds / 60),
    sessionsThisWeek,
  };
}

export async function fetchFocusStats(now: Date = new Date()): Promise<FocusStats> {
  const weekStart = startOfWeek(now).toISOString();
  const res = await fetch(`/api/stats?weekStart=${encodeURIComponent(weekStart)}`);
  if (!res.ok) throw new Error(`stats request failed: ${res.status}`);
  return (await res.json()) as FocusStats;
}
