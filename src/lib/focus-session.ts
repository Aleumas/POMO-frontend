import type { SupabaseClient } from "@supabase/supabase-js";
import { SessionMachineState, TimerContext } from "./session-machine-types";

export type FocusSessionInsert = {
  user_id: string;
  room_id: string;
  duration_seconds: number;
};

export function focusSessionFromContext(
  context: TimerContext,
): FocusSessionInsert | null {
  if (context.currentSessionState !== SessionMachineState.work) {
    return null;
  }
  if (!context.userId || !context.roomId) {
    return null;
  }
  if (!(context.duration > 0)) {
    return null;
  }
  return {
    user_id: context.userId,
    room_id: context.roomId,
    duration_seconds: context.duration,
  };
}

export async function insertFocusSession(
  supabase: Pick<SupabaseClient, "from">,
  row: FocusSessionInsert,
): Promise<void> {
  const { error } = await supabase.from("focus_session").insert(row);
  if (error) {
    throw error;
  }
}
