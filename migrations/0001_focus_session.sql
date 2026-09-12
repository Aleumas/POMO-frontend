CREATE TABLE IF NOT EXISTS focus_session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  completed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS focus_session_user_completed_idx
  ON focus_session (user_id, completed_at DESC);
