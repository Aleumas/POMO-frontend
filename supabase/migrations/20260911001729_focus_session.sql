create table public.focus_session (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  room_id text not null,
  duration_seconds integer not null check (duration_seconds > 0),
  completed_at timestamptz not null default now()
);

create index focus_session_user_completed_idx
  on public.focus_session (user_id, completed_at desc);

alter table public.focus_session enable row level security;

create policy "focus_session_insert_own"
  on public.focus_session
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "focus_session_select_own"
  on public.focus_session
  for select
  to authenticated
  using (auth.uid() = user_id);

-- week_start is passed by the client so "this week" respects the user's timezone.
create or replace function public.get_focus_stats(week_start timestamptz)
returns table (
  total_sessions bigint,
  total_minutes bigint,
  sessions_this_week bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*)::bigint as total_sessions,
    (coalesce(sum(duration_seconds), 0) / 60)::bigint as total_minutes,
    (count(*) filter (where completed_at >= week_start))::bigint as sessions_this_week
  from public.focus_session
  where user_id = auth.uid();
$$;

revoke execute on function public.get_focus_stats(timestamptz) from public, anon;
grant execute on function public.get_focus_stats(timestamptz) to authenticated;
