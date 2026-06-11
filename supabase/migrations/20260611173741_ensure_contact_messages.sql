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

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contact_messages
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists email text,
  add column if not exists subject text,
  add column if not exists message text,
  add column if not exists status text default 'new',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.contact_messages
  alter column id set default gen_random_uuid(),
  alter column email set not null,
  alter column subject set not null,
  alter column message set not null,
  alter column status set default 'new',
  alter column status set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.contact_messages
  drop constraint if exists contact_messages_status_check,
  drop constraint if exists contact_messages_email_present_check,
  drop constraint if exists contact_messages_subject_length_check,
  drop constraint if exists contact_messages_message_length_check;

alter table public.contact_messages
  add constraint contact_messages_status_check
    check (status in ('new', 'in_progress', 'closed', 'spam')),
  add constraint contact_messages_email_present_check
    check (length(btrim(email)) > 0),
  add constraint contact_messages_subject_length_check
    check (length(btrim(subject)) between 1 and 160),
  add constraint contact_messages_message_length_check
    check (length(btrim(message)) between 10 and 5000);

drop trigger if exists set_contact_messages_updated_at
on public.contact_messages;

create trigger set_contact_messages_updated_at
before update on public.contact_messages
for each row execute function public.set_updated_at();

alter table public.contact_messages enable row level security;

drop policy if exists "Users can create own contact messages"
on public.contact_messages;
create policy "Users can create own contact messages"
on public.contact_messages
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can read own contact messages"
on public.contact_messages;
create policy "Users can read own contact messages"
on public.contact_messages
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Support staff can manage contact messages"
on public.contact_messages;
create policy "Support staff can manage contact messages"
on public.contact_messages
for all
to authenticated
using (public.has_admin_role(array['owner', 'admin', 'support']::text[]))
with check (public.has_admin_role(array['owner', 'admin', 'support']::text[]));

drop policy if exists "Service role can manage contact messages"
on public.contact_messages;
create policy "Service role can manage contact messages"
on public.contact_messages
for all
to service_role
using (true)
with check (true);

create index if not exists contact_messages_user_id_idx
on public.contact_messages(user_id);

create index if not exists contact_messages_user_id_created_at_idx
on public.contact_messages(user_id, created_at desc);

create index if not exists contact_messages_status_idx
on public.contact_messages(status);

create index if not exists contact_messages_status_created_at_idx
on public.contact_messages(status, created_at desc);

create index if not exists contact_messages_created_at_idx
on public.contact_messages(created_at desc);

comment on table public.contact_messages is
  'Authenticated Contact Support submissions from Leo Finder users.';
