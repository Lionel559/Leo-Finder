alter table public.profiles
  drop constraint if exists profiles_experience_level_check;

update public.profiles
set experience_level = case experience_level
  when 'student' then 'beginner'
  when 'entry' then 'beginner'
  when 'mid' then 'intermediate'
  when 'senior' then 'advanced'
  when 'executive' then 'advanced'
  else experience_level
end
where experience_level in ('student', 'entry', 'mid', 'senior', 'executive');

alter table public.profiles
  add constraint profiles_experience_level_check
    check (
      experience_level is null
      or experience_level in ('beginner', 'intermediate', 'advanced')
    );

comment on column public.profiles.experience_level is
  'Onboarding career stage: beginner, intermediate, or advanced.';
