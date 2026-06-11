alter table public.email_logs
  drop constraint if exists email_logs_status_check;

alter table public.email_logs
  add constraint email_logs_status_check
  check (
    status in (
      'queued',
      'sent',
      'delivered',
      'bounced',
      'failed',
      'skipped',
      'development_blocked'
    )
  );
