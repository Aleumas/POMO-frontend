"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchFocusStats, type FocusStats } from "@/lib/focus-stats";

export function useFocusStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<FocusStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    fetchFocusStats(createClient())
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Failed to load statistics",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { stats, error, loading: stats === null && error === null };
}
