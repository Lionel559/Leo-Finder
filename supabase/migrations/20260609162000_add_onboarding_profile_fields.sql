alter table public.profiles
  add column if not exists preferred_roles text[] not null default '{}'::text[],
  add column if not exists experience_level text,
  add constraint profiles_experience_level_check
    check (
      experience_level is null
      or experience_level in ('student', 'entry', 'mid', 'senior', 'executive')
    );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on column public.profiles.preferred_roles is
  'Onboarding role targets used to personalize opportunity recommendations.';
comment on column public.profiles.experience_level is
  'Onboarding career stage used by the opportunity agent.';
