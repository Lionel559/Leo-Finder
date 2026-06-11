create extension if not exists "pgcrypto" with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organization text not null,
  category text not null,
  location text,
  remote_status text not null default 'unknown',
  description text not null,
  skills text[] not null default '{}'::text[],
  eligibility jsonb not null default '{}'::jsonb,
  salary_prize_amount text,
  deadline timestamptz,
  source_url text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  apply_url text,
  status text not null default 'published',
  updated_at timestamptz not null default now()
);

alter table public.opportunities
  add column if not exists title text,
  add column if not exists organization text,
  add column if not exists category text,
  add column if not exists location text,
  add column if not exists remote_status text default 'unknown',
  add column if not exists description text,
  add column if not exists skills text[] default '{}'::text[],
  add column if not exists eligibility jsonb default '{}'::jsonb,
  add column if not exists salary_prize_amount text,
  add column if not exists deadline timestamptz,
  add column if not exists source_url text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists expires_at timestamptz,
  add column if not exists apply_url text,
  add column if not exists status text default 'published',
  add column if not exists updated_at timestamptz default now();

update public.opportunities
set
  skills = coalesce(skills, '{}'::text[]),
  eligibility = coalesce(eligibility, '{}'::jsonb),
  remote_status = coalesce(remote_status, 'unknown'),
  status = coalesce(status, 'published'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.opportunities
  alter column title set not null,
  alter column organization set not null,
  alter column category set not null,
  alter column remote_status set default 'unknown',
  alter column remote_status set not null,
  alter column description set not null,
  alter column skills set default '{}'::text[],
  alter column skills set not null,
  alter column eligibility set default '{}'::jsonb,
  alter column eligibility set not null,
  alter column source_url set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column status set default 'published',
  alter column status set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.opportunities
  drop constraint if exists opportunities_category_check,
  drop constraint if exists opportunities_remote_status_check,
  drop constraint if exists opportunities_status_check,
  drop constraint if exists opportunities_source_url_http_check,
  drop constraint if exists opportunities_apply_url_http_check,
  drop constraint if exists opportunities_eligibility_type_check;

alter table public.opportunities
  add constraint opportunities_category_check
    check (category in (
      'job',
      'internship',
      'bounty',
      'grant',
      'scholarship',
      'fellowship',
      'startup_program',
      'hackathon'
    )),
  add constraint opportunities_remote_status_check
    check (remote_status in ('remote', 'hybrid', 'onsite', 'unknown')),
  add constraint opportunities_status_check
    check (status in ('draft', 'published', 'expired', 'archived')),
  add constraint opportunities_source_url_http_check
    check (source_url ~* '^https?://'),
  add constraint opportunities_apply_url_http_check
    check (apply_url is null or apply_url ~* '^https?://'),
  add constraint opportunities_eligibility_type_check
    check (jsonb_typeof(eligibility) in ('object', 'array'));

create table if not exists public.saved_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_opportunities_unique_user_opportunity unique (user_id, opportunity_id)
);

alter table public.saved_opportunities
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists opportunity_id uuid references public.opportunities(id) on delete cascade,
  add column if not exists notes text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.saved_opportunities
  alter column user_id set not null,
  alter column opportunity_id set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  drop constraint if exists saved_opportunities_unique_user_opportunity,
  add constraint saved_opportunities_unique_user_opportunity unique (user_id, opportunity_id);

drop trigger if exists set_opportunities_updated_at
on public.opportunities;

create trigger set_opportunities_updated_at
before update on public.opportunities
for each row execute function public.set_updated_at();

drop trigger if exists set_saved_opportunities_updated_at
on public.saved_opportunities;

create trigger set_saved_opportunities_updated_at
before update on public.saved_opportunities
for each row execute function public.set_updated_at();

alter table public.opportunities enable row level security;
alter table public.saved_opportunities enable row level security;

drop policy if exists "Public can read published opportunities"
on public.opportunities;
create policy "Public can read published opportunities"
on public.opportunities
for select
to anon, authenticated
using (
  status = 'published'
  and (expires_at is null or expires_at > now())
);

drop policy if exists "Admins can manage opportunities"
on public.opportunities;
create policy "Admins can manage opportunities"
on public.opportunities
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Service role can manage opportunities"
on public.opportunities;
create policy "Service role can manage opportunities"
on public.opportunities
for all
to service_role
using (true)
with check (true);

drop policy if exists "Users can manage own saved opportunities"
on public.saved_opportunities;
create policy "Users can manage own saved opportunities"
on public.saved_opportunities
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Admins can manage saved opportunities"
on public.saved_opportunities;
create policy "Admins can manage saved opportunities"
on public.saved_opportunities
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Service role can manage saved opportunities"
on public.saved_opportunities;
create policy "Service role can manage saved opportunities"
on public.saved_opportunities
for all
to service_role
using (true)
with check (true);

create index if not exists opportunities_category_idx
on public.opportunities(category);

create index if not exists opportunities_deadline_idx
on public.opportunities(deadline);

create index if not exists opportunities_location_idx
on public.opportunities(location);

create index if not exists opportunities_remote_status_idx
on public.opportunities(remote_status);

create index if not exists opportunities_created_at_idx
on public.opportunities(created_at);

create index if not exists opportunities_status_expires_at_idx
on public.opportunities(status, expires_at);

create index if not exists opportunities_salary_prize_amount_idx
on public.opportunities(salary_prize_amount);

create index if not exists opportunities_skills_gin_idx
on public.opportunities using gin(skills);

create index if not exists saved_opportunities_user_id_idx
on public.saved_opportunities(user_id);

create index if not exists saved_opportunities_opportunity_id_idx
on public.saved_opportunities(opportunity_id);

create index if not exists saved_opportunities_user_created_at_idx
on public.saved_opportunities(user_id, created_at desc);
