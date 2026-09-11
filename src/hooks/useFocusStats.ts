"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchFocusStats, type FocusStats } from "@/lib/focus-stats";

function hasStringMessage(e: unknown): e is { message: string } {
  return (
    typeof e === "object" &&
    e !== null &&
    typeof (e as { message?: unknown }).message === "string"
  );
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (hasStringMessage(e)) return e.message;
  return "Failed to load statistics";
}

export function useFocusStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<FocusStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Clear stale state whenever the user changes (including logout) and
    // before a new fetch starts, so callers never see the previous user's
    // stats/error and `loading` reflects the in-flight request.
    setStats(null);
    setError(null);

    if (!user?.id) {
      return;
    }

    let cancelled = false;

    fetchFocusStats(createClient())
      .then((result) => {
        if (!cancelled) {
          setStats(result);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setStats(null);
          setError(errorMessage(e));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { stats, error, loading: stats === null && error === null };
}
