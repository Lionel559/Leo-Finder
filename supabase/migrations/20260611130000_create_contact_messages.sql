create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_messages_status_check
    check (status in ('new', 'in_progress', 'closed', 'spam'))
);

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

create index if not exists contact_messages_status_idx
on public.contact_messages(status);

create index if not exists contact_messages_created_at_idx
on public.contact_messages(created_at desc);
