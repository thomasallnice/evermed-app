-- Time-series metrics for user vitals (e.g., weight)
create table if not exists public.user_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null, -- e.g., 'weight_kg', 'height_cm', 'bmi'
  value_num numeric not null,
  unit text,         -- e.g., 'kg', 'cm'
  source text,       -- e.g., 'chat', 'profile-page'
  recorded_at timestamptz not null default now()
);

create index if not exists idx_user_metrics_user_kind_time on public.user_metrics(user_id, kind, recorded_at desc);

alter table public.user_metrics enable row level security;
drop policy if exists "metrics_select" on public.user_metrics;
drop policy if exists "metrics_modify" on public.user_metrics;
create policy "metrics_select" on public.user_metrics for select using (auth.uid() = user_id);
create policy "metrics_modify" on public.user_metrics for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

