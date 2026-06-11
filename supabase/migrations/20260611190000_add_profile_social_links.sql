alter table public.profiles
  add column if not exists portfolio_url text,
  add column if not exists github_url text,
  add column if not exists linkedin_url text;

update public.profiles
set portfolio_url = website_url
where portfolio_url is null
  and website_url is not null;

comment on column public.profiles.portfolio_url is
  'Primary portfolio or personal site URL shown on the user profile.';
comment on column public.profiles.github_url is
  'GitHub profile URL used by matching and resume intelligence workflows.';
comment on column public.profiles.linkedin_url is
  'LinkedIn profile URL used by matching and career coaching workflows.';
