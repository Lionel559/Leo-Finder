alter table public.telegram_connection_attempts
  drop constraint if exists telegram_connection_attempts_status_check;

update public.telegram_connection_attempts
set status = 'completed'
where status = 'connected';

alter table public.telegram_connection_attempts
  add constraint telegram_connection_attempts_status_check
  check (status in ('pending', 'completed', 'expired', 'canceled'));
