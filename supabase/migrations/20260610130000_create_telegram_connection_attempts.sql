create table if not exists public.telegram_connection_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_code text unique not null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_telegram_connection_attempts_updated_at
on public.telegram_connection_attempts;

create trigger set_telegram_connection_attempts_updated_at
before update on public.telegram_connection_attempts
for each row execute function public.set_updated_at();

alter table public.telegram_connection_attempts enable row level security;

drop policy if exists "Users can read own telegram connection attempts"
on public.telegram_connection_attempts;
create policy "Users can read own telegram connection attempts"
on public.telegram_connection_attempts
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create own telegram connection attempts"
on public.telegram_connection_attempts;
create policy "Users can create own telegram connection attempts"
on public.telegram_connection_attempts
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Service role can manage telegram connection attempts"
on public.telegram_connection_attempts;
create policy "Service role can manage telegram connection attempts"
on public.telegram_connection_attempts
for all
to service_role
using (true)
with check (true);

create index if not exists telegram_connection_attempts_user_id_idx
on public.telegram_connection_attempts(user_id);

create index if not exists telegram_connection_attempts_connection_code_idx
on public.telegram_connection_attempts(connection_code);

create index if not exists telegram_connection_attempts_expires_at_idx
on public.telegram_connection_attempts(expires_at);
