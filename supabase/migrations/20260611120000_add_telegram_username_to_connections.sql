alter table public.telegram_connections
add column if not exists telegram_username text;

update public.telegram_connections
set telegram_username = username
where telegram_username is null
  and username is not null;
