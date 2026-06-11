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

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  headline text,
  bio text,
  location text,
  timezone text,
  avatar_url text,
  website_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  category text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skills_slug_format_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'admin',
  permissions text[] not null default '{}'::text[],
  is_active boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_role_check
    check (role in ('owner', 'admin', 'editor', 'support'))
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  monthly_price_cents integer not null default 0,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_slug_check
    check (slug in ('free', 'starter', 'pro')),
  constraint plans_monthly_price_cents_check
    check (monthly_price_cents >= 0)
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_url text not null,
  source_type text not null default 'manual',
  status text not null default 'active',
  reliability_score numeric(5,2) not null default 0,
  last_checked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sources_source_url_http_check
    check (source_url ~* '^https?://'),
  constraint sources_source_type_check
    check (source_type in ('api', 'rss', 'scraper', 'manual', 'partner')),
  constraint sources_status_check
    check (status in ('active', 'inactive', 'failing')),
  constraint sources_reliability_score_check
    check (reliability_score between 0 and 100)
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  external_id text,
  title text not null,
  organization text not null,
  category text not null,
  location text,
  remote_status text not null default 'unknown',
  deadline timestamptz,
  source_url text not null,
  apply_url text,
  description text not null,
  skills text[] not null default '{}'::text[],
  eligibility jsonb not null default '{}'::jsonb,
  salary_prize_amount text,
  status text not null default 'published',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_category_check
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
  constraint opportunities_remote_status_check
    check (remote_status in ('remote', 'hybrid', 'onsite', 'unknown')),
  constraint opportunities_status_check
    check (status in ('draft', 'published', 'expired', 'archived')),
  constraint opportunities_source_url_http_check
    check (source_url ~* '^https?://'),
  constraint opportunities_apply_url_http_check
    check (apply_url is null or apply_url ~* '^https?://'),
  constraint opportunities_eligibility_type_check
    check (jsonb_typeof(eligibility) in ('object', 'array'))
);

create table public.user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  proficiency text,
  years_experience numeric(4,1),
  source text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_skills_unique_skill unique (user_id, skill_id),
  constraint user_skills_proficiency_check
    check (proficiency is null or proficiency in ('beginner', 'intermediate', 'advanced', 'expert')),
  constraint user_skills_years_experience_check
    check (years_experience is null or years_experience >= 0),
  constraint user_skills_source_check
    check (source in ('user', 'resume', 'ai', 'import'))
);

create table public.opportunity_skills (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  importance text not null default 'preferred',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunity_skills_unique_skill unique (opportunity_id, skill_id),
  constraint opportunity_skills_importance_check
    check (importance in ('required', 'preferred', 'nice_to_have'))
);

create table public.saved_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_opportunities_unique_user_opportunity unique (user_id, opportunity_id)
);

create table public.resume_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  storage_path text,
  mime_type text,
  file_size_bytes bigint,
  checksum text,
  parsed_text text,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resume_uploads_file_size_check
    check (file_size_bytes is null or file_size_bytes >= 0)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  resume_upload_id uuid references public.resume_uploads(id) on delete set null,
  status text not null default 'saved',
  applied_at timestamptz,
  next_step_at timestamptz,
  notes text,
  opportunity_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_unique_user_opportunity unique (user_id, opportunity_id),
  constraint applications_status_check
    check (status in (
      'saved',
      'applied',
      'interviewing',
      'offer_received',
      'rejected',
      'completed'
    ))
);

create table public.resume_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_upload_id uuid not null references public.resume_uploads(id) on delete cascade,
  summary text,
  skills text[] not null default '{}'::text[],
  strengths text[] not null default '{}'::text[],
  gaps text[] not null default '{}'::text[],
  experience_years numeric(4,1),
  education jsonb not null default '[]'::jsonb,
  preferred_roles text[] not null default '{}'::text[],
  industries text[] not null default '{}'::text[],
  seniority text,
  model_name text,
  analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resume_analyses_experience_years_check
    check (experience_years is null or experience_years >= 0),
  constraint resume_analyses_seniority_check
    check (seniority is null or seniority in ('entry', 'mid', 'senior', 'executive'))
);

create table public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  application_id uuid references public.applications(id) on delete set null,
  title text,
  content text not null,
  tone text,
  model_name text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cover_letters_status_check
    check (status in ('draft', 'final', 'archived'))
);

create table public.application_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  application_id uuid references public.applications(id) on delete set null,
  question text not null,
  answer text not null,
  model_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.advisor_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  context jsonb not null default '{}'::jsonb,
  messages jsonb not null default '[]'::jsonb,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advisor_sessions_messages_array_check
    check (jsonb_typeof(messages) = 'array')
);

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  preferred_categories text[] not null default '{}'::text[],
  preferred_locations text[] not null default '{}'::text[],
  preferred_remote_statuses text[] not null default '{}'::text[],
  preferred_skills text[] not null default '{}'::text[],
  minimum_salary_prize_amount numeric(12,2),
  notification_frequency text not null default 'daily',
  telegram_enabled boolean not null default false,
  email_enabled boolean not null default true,
  preference_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_minimum_amount_check
    check (minimum_salary_prize_amount is null or minimum_salary_prize_amount >= 0),
  constraint user_preferences_notification_frequency_check
    check (notification_frequency in ('instant', 'daily', 'weekly', 'never')),
  constraint user_preferences_categories_check
    check (preferred_categories <@ array[
      'job',
      'internship',
      'bounty',
      'grant',
      'scholarship',
      'fellowship',
      'startup_program',
      'hackathon'
    ]::text[]),
  constraint user_preferences_remote_statuses_check
    check (preferred_remote_statuses <@ array['remote', 'hybrid', 'onsite', 'unknown']::text[])
);

create table public.recommendation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  score numeric(5,2) not null,
  confidence numeric(5,2),
  reasons text[] not null default '{}'::text[],
  missing_requirements text[] not null default '{}'::text[],
  model_name text,
  context jsonb not null default '{}'::jsonb,
  recommended_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint recommendation_history_score_check
    check (score between 0 and 100),
  constraint recommendation_history_confidence_check
    check (confidence is null or confidence between 0 and 100)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  channel text not null default 'in_app',
  title text not null,
  body text,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_channel_check
    check (channel in ('in_app', 'email', 'telegram', 'api')),
  constraint notifications_status_check
    check (status in ('pending', 'sent', 'read', 'failed'))
);

create table public.telegram_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  telegram_user_id text not null,
  chat_id text not null,
  username text,
  status text not null default 'active',
  connected_at timestamptz not null default now(),
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint telegram_connections_status_check
    check (status in ('active', 'disabled', 'revoked'))
);

create table public.opportunity_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  title text not null,
  organization text,
  source_url text,
  category text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunity_submissions_source_url_http_check
    check (source_url is null or source_url ~* '^https?://'),
  constraint opportunity_submissions_category_check
    check (category is null or category in (
      'job',
      'internship',
      'bounty',
      'grant',
      'scholarship',
      'fellowship',
      'startup_program',
      'hackathon'
    )),
  constraint opportunity_submissions_status_check
    check (status in ('pending', 'approved', 'rejected', 'imported'))
);

create table public.verified_sources (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  domain text not null,
  verification_status text not null default 'pending',
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verified_sources_unique_domain unique (source_id, domain),
  constraint verified_sources_status_check
    check (verification_status in ('pending', 'verified', 'rejected'))
);

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key_prefix text not null unique,
  key_hash text not null unique,
  status text not null default 'active',
  scopes text[] not null default '{}'::text[],
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint api_keys_status_check
    check (status in ('active', 'revoked', 'suspended'))
);

create table public.api_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  api_key_id uuid not null references public.api_keys(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  requests_count integer not null default 0,
  successful_requests integer not null default 0,
  failed_requests integer not null default 0,
  daily_usage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint api_usage_unique_period unique (api_key_id, period_start, period_end),
  constraint api_usage_period_check
    check (period_end >= period_start),
  constraint api_usage_counts_check
    check (
      requests_count >= 0
      and successful_requests >= 0
      and failed_requests >= 0
    )
);

create table public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  plan_slug text not null references public.plans(slug) on update cascade on delete cascade,
  channel text not null default 'direct_api',
  monthly_limit integer not null,
  daily_limit integer not null,
  requests_per_minute integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rate_limits_unique_plan_channel unique (plan_slug, channel),
  constraint rate_limits_channel_check
    check (channel in ('direct_api', 'rapidapi')),
  constraint rate_limits_positive_check
    check (
      monthly_limit >= 0
      and daily_limit >= 0
      and requests_per_minute >= 0
    )
);

create table public.request_logs (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references public.api_keys(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  request_id text,
  gateway text not null default 'direct',
  method text not null,
  path text not null,
  status_code integer,
  latency_ms integer,
  ip_address inet,
  user_agent text,
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint request_logs_gateway_check
    check (gateway in ('direct', 'rapidapi')),
  constraint request_logs_latency_check
    check (latency_ms is null or latency_ms >= 0),
  constraint request_logs_status_code_check
    check (status_code is null or status_code between 100 and 599)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  status text not null default 'active',
  current_period_start date,
  current_period_end date,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_status_check
    check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  constraint subscriptions_period_check
    check (
      current_period_start is null
      or current_period_end is null
      or current_period_end >= current_period_start
    )
);

create table public.opportunity_views (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  referrer text,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  event_name text not null,
  event_type text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email_to text not null,
  template text,
  subject text,
  status text not null default 'queued',
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint email_logs_status_check
    check (status in ('queued', 'sent', 'delivered', 'bounced', 'failed'))
);

create table public.security_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  severity text not null default 'info',
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint security_logs_severity_check
    check (severity in ('info', 'warning', 'critical'))
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null,
  cover_image_url text,
  status text not null default 'draft',
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_slug_format_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint blog_posts_status_check
    check (status in ('draft', 'published', 'archived'))
);

create table public.seo_pages (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  title text not null,
  description text,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seo_pages_path_format_check
    check (path ~ '^/'),
  constraint seo_pages_status_check
    check (status in ('draft', 'published', 'archived'))
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and is_active = true
  );
$$;

create or replace function public.has_admin_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and is_active = true
      and role = any(required_roles)
  );
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'skills',
    'admin_users',
    'plans',
    'sources',
    'opportunities',
    'user_skills',
    'opportunity_skills',
    'saved_opportunities',
    'resume_uploads',
    'applications',
    'resume_analyses',
    'cover_letters',
    'application_answers',
    'advisor_sessions',
    'user_preferences',
    'notifications',
    'telegram_connections',
    'opportunity_submissions',
    'verified_sources',
    'api_keys',
    'api_usage',
    'rate_limits',
    'subscriptions',
    'blog_posts',
    'seo_pages'
  ]
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      'set_' || table_name || '_updated_at',
      table_name
    );

    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      'set_' || table_name || '_updated_at',
      table_name
    );
  end loop;
end;
$$;

create index opportunities_category_idx on public.opportunities(category);
create index opportunities_deadline_idx on public.opportunities(deadline);
create index opportunities_location_idx on public.opportunities(location);
create index opportunities_remote_status_idx on public.opportunities(remote_status);
create index opportunities_created_at_idx on public.opportunities(created_at);
create index opportunities_status_expires_at_idx on public.opportunities(status, expires_at);
create index opportunities_skills_gin_idx on public.opportunities using gin(skills);
create index opportunity_skills_opportunity_id_idx on public.opportunity_skills(opportunity_id);
create index opportunity_skills_skill_id_idx on public.opportunity_skills(skill_id);
create index saved_opportunities_user_id_idx on public.saved_opportunities(user_id);
create index saved_opportunities_opportunity_id_idx on public.saved_opportunities(opportunity_id);
create index applications_user_id_idx on public.applications(user_id);
create index applications_opportunity_id_idx on public.applications(opportunity_id);
create index resume_uploads_user_id_idx on public.resume_uploads(user_id);
create index resume_analyses_user_id_idx on public.resume_analyses(user_id);
create index cover_letters_user_id_idx on public.cover_letters(user_id);
create index application_answers_user_id_idx on public.application_answers(user_id);
create index advisor_sessions_user_id_idx on public.advisor_sessions(user_id);
create index recommendation_history_user_id_idx on public.recommendation_history(user_id);
create index notifications_user_id_idx on public.notifications(user_id);
create index telegram_connections_user_id_idx on public.telegram_connections(user_id);
create index opportunity_submissions_submitted_by_idx on public.opportunity_submissions(submitted_by);
create index verified_sources_source_id_idx on public.verified_sources(source_id);
create index api_keys_user_id_idx on public.api_keys(user_id);
create index api_usage_user_id_idx on public.api_usage(user_id);
create index api_usage_api_key_id_idx on public.api_usage(api_key_id);
create index request_logs_api_key_id_idx on public.request_logs(api_key_id);
create index request_logs_user_id_idx on public.request_logs(user_id);
create index request_logs_created_at_idx on public.request_logs(created_at);
create index subscriptions_user_id_idx on public.subscriptions(user_id);
create index opportunity_views_opportunity_id_idx on public.opportunity_views(opportunity_id);
create index opportunity_views_user_id_idx on public.opportunity_views(user_id);
create index analytics_events_user_id_idx on public.analytics_events(user_id);
create index user_activity_user_id_idx on public.user_activity(user_id);
create index email_logs_user_id_idx on public.email_logs(user_id);
create index security_logs_user_id_idx on public.security_logs(user_id);
create index audit_logs_actor_user_id_idx on public.audit_logs(actor_user_id);
create index blog_posts_status_published_at_idx on public.blog_posts(status, published_at);
create index seo_pages_status_published_at_idx on public.seo_pages(status, published_at);

insert into public.plans (slug, name, description, monthly_price_cents, features)
values
  (
    'free',
    'Free',
    'Entry plan for lightweight opportunity discovery and API testing.',
    0,
    '{"api": true, "monthly_api_limit": 100}'::jsonb
  ),
  (
    'starter',
    'Starter',
    'Starter plan for builders who need higher API volume.',
    1900,
    '{"api": true, "monthly_api_limit": 2000}'::jsonb
  ),
  (
    'pro',
    'Pro',
    'Pro plan for production API consumers and advanced agents.',
    4900,
    '{"api": true, "monthly_api_limit": 10000}'::jsonb
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  monthly_price_cents = excluded.monthly_price_cents,
  features = excluded.features,
  updated_at = now();

insert into public.rate_limits (plan_slug, channel, monthly_limit, daily_limit, requests_per_minute)
values
  ('free', 'direct_api', 100, 20, 10),
  ('starter', 'direct_api', 2000, 200, 60),
  ('pro', 'direct_api', 10000, 1000, 120)
on conflict (plan_slug, channel) do update
set
  monthly_limit = excluded.monthly_limit,
  daily_limit = excluded.daily_limit,
  requests_per_minute = excluded.requests_per_minute,
  updated_at = now();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'skills',
    'admin_users',
    'plans',
    'sources',
    'opportunities',
    'user_skills',
    'opportunity_skills',
    'saved_opportunities',
    'resume_uploads',
    'applications',
    'resume_analyses',
    'cover_letters',
    'application_answers',
    'advisor_sessions',
    'user_preferences',
    'recommendation_history',
    'notifications',
    'telegram_connections',
    'opportunity_submissions',
    'verified_sources',
    'api_keys',
    'api_usage',
    'rate_limits',
    'request_logs',
    'subscriptions',
    'opportunity_views',
    'analytics_events',
    'user_activity',
    'email_logs',
    'security_logs',
    'audit_logs',
    'blog_posts',
    'seo_pages'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create policy "Users can manage own profile"
on public.profiles
for all
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Admins can manage profiles"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage profiles"
on public.profiles
for all
to service_role
using (true)
with check (true);

create policy "Public can read skills"
on public.skills
for select
to anon, authenticated
using (true);

create policy "Admins can manage skills"
on public.skills
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage skills"
on public.skills
for all
to service_role
using (true)
with check (true);

create policy "Admins can read admin users"
on public.admin_users
for select
to authenticated
using (public.is_admin());

create policy "Owners can manage admin users"
on public.admin_users
for all
to authenticated
using (public.has_admin_role(array['owner']::text[]))
with check (public.has_admin_role(array['owner']::text[]));

create policy "Service role can manage admin users"
on public.admin_users
for all
to service_role
using (true)
with check (true);

create policy "Public can read active plans"
on public.plans
for select
to anon, authenticated
using (is_active = true);

create policy "Admins can manage plans"
on public.plans
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage plans"
on public.plans
for all
to service_role
using (true)
with check (true);

create policy "Public can read active sources"
on public.sources
for select
to anon, authenticated
using (status = 'active');

create policy "Admins can manage sources"
on public.sources
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage sources"
on public.sources
for all
to service_role
using (true)
with check (true);

create policy "Public can read published opportunities"
on public.opportunities
for select
to anon, authenticated
using (
  status = 'published'
  and (expires_at is null or expires_at > now())
);

create policy "Admins can manage opportunities"
on public.opportunities
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage opportunities"
on public.opportunities
for all
to service_role
using (true)
with check (true);

create policy "Users can manage own skills"
on public.user_skills
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins can manage user skills"
on public.user_skills
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage user skills"
on public.user_skills
for all
to service_role
using (true)
with check (true);

create policy "Public can read published opportunity skills"
on public.opportunity_skills
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.opportunities
    where opportunities.id = opportunity_skills.opportunity_id
      and opportunities.status = 'published'
      and (opportunities.expires_at is null or opportunities.expires_at > now())
  )
);

create policy "Admins can manage opportunity skills"
on public.opportunity_skills
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage opportunity skills"
on public.opportunity_skills
for all
to service_role
using (true)
with check (true);

create policy "Users can manage own saved opportunities"
on public.saved_opportunities
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins can manage saved opportunities"
on public.saved_opportunities
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage saved opportunities"
on public.saved_opportunities
for all
to service_role
using (true)
with check (true);

create policy "Users can manage own resume uploads"
on public.resume_uploads
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins can manage resume uploads"
on public.resume_uploads
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage resume uploads"
on public.resume_uploads
for all
to service_role
using (true)
with check (true);

create policy "Users can manage own applications"
on public.applications
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins can manage applications"
on public.applications
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage applications"
on public.applications
for all
to service_role
using (true)
with check (true);

create policy "Users can manage own resume analyses"
on public.resume_analyses
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins can manage resume analyses"
on public.resume_analyses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage resume analyses"
on public.resume_analyses
for all
to service_role
using (true)
with check (true);

create policy "Users can manage own cover letters"
on public.cover_letters
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins can manage cover letters"
on public.cover_letters
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage cover letters"
on public.cover_letters
for all
to service_role
using (true)
with check (true);

create policy "Users can manage own application answers"
on public.application_answers
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins can manage application answers"
on public.application_answers
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage application answers"
on public.application_answers
for all
to service_role
using (true)
with check (true);

create policy "Users can manage own advisor sessions"
on public.advisor_sessions
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins can manage advisor sessions"
on public.advisor_sessions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage advisor sessions"
on public.advisor_sessions
for all
to service_role
using (true)
with check (true);

create policy "Users can manage own preferences"
on public.user_preferences
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins can manage preferences"
on public.user_preferences
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage preferences"
on public.user_preferences
for all
to service_role
using (true)
with check (true);

create policy "Users can read own recommendation history"
on public.recommendation_history
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can delete own recommendation history"
on public.recommendation_history
for delete
to authenticated
using (user_id = auth.uid());

create policy "Admins can manage recommendation history"
on public.recommendation_history
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage recommendation history"
on public.recommendation_history
for all
to service_role
using (true)
with check (true);

create policy "Users can read own notifications"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can update own notifications"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete own notifications"
on public.notifications
for delete
to authenticated
using (user_id = auth.uid());

create policy "Admins can manage notifications"
on public.notifications
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage notifications"
on public.notifications
for all
to service_role
using (true)
with check (true);

create policy "Users can manage own telegram connections"
on public.telegram_connections
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins can manage telegram connections"
on public.telegram_connections
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage telegram connections"
on public.telegram_connections
for all
to service_role
using (true)
with check (true);

create policy "Users can submit opportunities"
on public.opportunity_submissions
for insert
to authenticated
with check (submitted_by = auth.uid());

create policy "Users can read own opportunity submissions"
on public.opportunity_submissions
for select
to authenticated
using (submitted_by = auth.uid());

create policy "Users can update own pending opportunity submissions"
on public.opportunity_submissions
for update
to authenticated
using (submitted_by = auth.uid() and status = 'pending')
with check (submitted_by = auth.uid() and status = 'pending');

create policy "Admins can manage opportunity submissions"
on public.opportunity_submissions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage opportunity submissions"
on public.opportunity_submissions
for all
to service_role
using (true)
with check (true);

create policy "Admins can manage verified sources"
on public.verified_sources
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage verified sources"
on public.verified_sources
for all
to service_role
using (true)
with check (true);

create policy "Users can manage own api keys"
on public.api_keys
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins can manage api keys"
on public.api_keys
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage api keys"
on public.api_keys
for all
to service_role
using (true)
with check (true);

create policy "Users can read own api usage"
on public.api_usage
for select
to authenticated
using (user_id = auth.uid());

create policy "Admins can manage api usage"
on public.api_usage
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage api usage"
on public.api_usage
for all
to service_role
using (true)
with check (true);

create policy "Public can read rate limits"
on public.rate_limits
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.plans
    where plans.slug = rate_limits.plan_slug
      and plans.is_active = true
  )
);

create policy "Admins can manage rate limits"
on public.rate_limits
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage rate limits"
on public.rate_limits
for all
to service_role
using (true)
with check (true);

create policy "Users can read own request logs"
on public.request_logs
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.api_keys
    where api_keys.id = request_logs.api_key_id
      and api_keys.user_id = auth.uid()
  )
);

create policy "Admins can manage request logs"
on public.request_logs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage request logs"
on public.request_logs
for all
to service_role
using (true)
with check (true);

create policy "Users can read own subscriptions"
on public.subscriptions
for select
to authenticated
using (user_id = auth.uid());

create policy "Admins can manage subscriptions"
on public.subscriptions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage subscriptions"
on public.subscriptions
for all
to service_role
using (true)
with check (true);

create policy "Users can read own opportunity views"
on public.opportunity_views
for select
to authenticated
using (user_id = auth.uid());

create policy "Admins can manage opportunity views"
on public.opportunity_views
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage opportunity views"
on public.opportunity_views
for all
to service_role
using (true)
with check (true);

create policy "Users can read own analytics events"
on public.analytics_events
for select
to authenticated
using (user_id = auth.uid());

create policy "Admins can manage analytics events"
on public.analytics_events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage analytics events"
on public.analytics_events
for all
to service_role
using (true)
with check (true);

create policy "Users can read own activity"
on public.user_activity
for select
to authenticated
using (user_id = auth.uid());

create policy "Admins can manage user activity"
on public.user_activity
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage user activity"
on public.user_activity
for all
to service_role
using (true)
with check (true);

create policy "Admins can manage email logs"
on public.email_logs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage email logs"
on public.email_logs
for all
to service_role
using (true)
with check (true);

create policy "Admins can manage security logs"
on public.security_logs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage security logs"
on public.security_logs
for all
to service_role
using (true)
with check (true);

create policy "Admins can manage audit logs"
on public.audit_logs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage audit logs"
on public.audit_logs
for all
to service_role
using (true)
with check (true);

create policy "Public can read published blog posts"
on public.blog_posts
for select
to anon, authenticated
using (
  status = 'published'
  and (published_at is null or published_at <= now())
);

create policy "Admins can manage blog posts"
on public.blog_posts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage blog posts"
on public.blog_posts
for all
to service_role
using (true)
with check (true);

create policy "Public can read published seo pages"
on public.seo_pages
for select
to anon, authenticated
using (
  status = 'published'
  and (published_at is null or published_at <= now())
);

create policy "Admins can manage seo pages"
on public.seo_pages
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Service role can manage seo pages"
on public.seo_pages
for all
to service_role
using (true)
with check (true);

comment on table public.profiles is
  'User profile and onboarding memory linked one-to-one with auth.users.';
comment on table public.opportunities is
  'Canonical opportunity inventory for jobs, grants, bounties, scholarships, fellowships, startup programs, and hackathons.';
comment on column public.opportunities.skills is
  'Denormalized skill tags for fast API filtering; opportunity_skills stores normalized skill relationships.';
comment on table public.resume_uploads is
  'Uploaded resume files and extracted text used by AI analysis workflows.';
comment on table public.resume_analyses is
  'Structured AI interpretation of a resume, including strengths, gaps, seniority, and target roles.';
comment on table public.cover_letters is
  'AI-generated or user-edited cover letters tied to opportunities and applications.';
comment on table public.advisor_sessions is
  'Conversation memory for the Leo Finder opportunity advisor.';
comment on table public.recommendation_history is
  'Historical AI opportunity recommendations used for memory, deduplication, and explainability.';
comment on table public.notifications is
  'Notification queue and delivery state across in-app, email, Telegram, and API channels.';
comment on table public.telegram_connections is
  'Telegram chat mapping for sending opportunity alerts without storing bot secrets.';
comment on table public.sources is
  'Discovery and import sources monitored by service-role collection jobs.';
comment on table public.opportunity_submissions is
  'User or partner-submitted opportunities awaiting review/import.';
comment on table public.verified_sources is
  'Admin-vetted source domains and verification metadata.';
comment on table public.api_keys is
  'API credentials for monetized access; only prefixes and hashes are stored, never raw secrets.';
comment on table public.api_usage is
  'Aggregated API usage counters per key and billing period.';
comment on table public.rate_limits is
  'Rate limit rules by plan and API channel, including future RapidAPI support.';
comment on table public.request_logs is
  'Per-request API logs for debugging, abuse monitoring, and usage reconciliation.';
comment on table public.plans is
  'Internal plan catalog for free, starter, and pro access levels; payment integration is intentionally not included.';
comment on table public.subscriptions is
  'User plan assignment and subscription period state without payment-provider coupling.';
comment on table public.audit_logs is
  'Immutable administrative change history for sensitive system operations.';
comment on table public.security_logs is
  'Security-relevant events such as auth failures, suspicious traffic, and policy violations.';
comment on table public.admin_users is
  'Protected admin membership table used by RLS helper functions.';
comment on table public.blog_posts is
  'SEO blog content with public reads limited to published posts.';
comment on table public.seo_pages is
  'SEO landing and indexable content pages with public reads limited to published pages.';
