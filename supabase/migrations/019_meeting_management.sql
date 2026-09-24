begin;

create table if not exists public.meetings (
  id text primary key check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and length(id) <= 120),
  title text not null check (length(title) between 1 and 300),
  summary text not null check (length(summary) between 1 and 1200),
  meeting_date date not null,
  time_label text not null check (length(time_label) between 1 and 80),
  timezone text not null default 'America/Chicago' check (length(timezone) <= 100),
  location text not null check (length(location) between 1 and 300),
  status text not null check (status in ('confirmed', 'tentative')),
  topics jsonb not null default '[]'::jsonb check (jsonb_typeof(topics) = 'array'),
  resources jsonb not null default '[]'::jsonb check (jsonb_typeof(resources) = 'array'),
  url text not null default '' check (length(url) <= 2000),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meetings enable row level security;
drop policy if exists "Public published meetings" on public.meetings;
create policy "Public published meetings" on public.meetings for select to anon using (published);
drop policy if exists "Owner meetings" on public.meetings;
create policy "Owner meetings" on public.meetings for all to authenticated
  using (public.is_editor()) with check (public.is_editor());
revoke all on public.meetings from anon, authenticated;
grant select (id,title,summary,meeting_date,time_label,timezone,location,status,topics,resources,url,published) on public.meetings to anon;
grant select, insert, update, delete on public.meetings to authenticated;
grant all on public.meetings to service_role;

drop trigger if exists meetings_updated on public.meetings;
create trigger meetings_updated before update on public.meetings
for each row execute function public.touch_updated_at();

-- Server-only, privacy-preserving lockout state for the focused meeting PIN.
create table if not exists public.meeting_admin_attempts (
  rate_key text primary key check (length(rate_key) = 64),
  attempts integer not null default 0 check (attempts >= 0),
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.meeting_admin_attempts enable row level security;
revoke all on public.meeting_admin_attempts from public, anon, authenticated;
grant all on public.meeting_admin_attempts to service_role;

insert into public.meetings
  (id,title,summary,meeting_date,time_label,timezone,location,status,topics,resources,url,published)
values
  (
    'first-exchange-2026-09-25',
    'The first exchange of ideas.',
    'An approachable introduction to research, why it matters, routes students can pursue, and concrete ways to begin.',
    '2026-09-25', 'During lunch', 'America/Chicago', 'Martin HS · Room 186C', 'confirmed',
    '["What research is, how it connects to existing interests, and why beginning does not have to be intimidating.","How applied research can strengthen college applications, resumes, internships, and future work without becoming a credential-only exercise.","Competitions, fairs, workshops, and publication routes students can realistically explore.","A practical process for generating ideas, narrowing a question, and executing a first study or build.","Concrete next steps for ISEF, a workshop submission, an independent project, and the Matrix research guides.","Questions, closing notes, and how to join Matrix Fellows."]'::jsonb,
    '[{"title":"Start with the research guides","url":"/guides","note":"Practical help for finding an idea, contacting mentors, planning, and presenting work."},{"title":"Browse research opportunities","url":"/opportunities","note":"Explore science fairs, workshops, programs, internships, and submission routes."},{"title":"Society for Science — ISEF","url":"https://www.societyforscience.org/isef/","note":"Official overview of the international science and engineering fair pathway."}]'::jsonb,
    '', true
  ),
  (
    'isef-pathway-2026-10-09',
    'From an ISEF interest to a regional-fair entry.',
    'A working session on teams, the ISEF pathway, near-term deadlines, example projects, and starting a Fort Worth regional-fair registration.',
    '2026-10-09', 'During lunch · projected', 'America/Chicago', 'Martin HS · room to be confirmed', 'tentative',
    '["How ISEF works, why students qualify through affiliated fairs, and where the Fort Worth Regional Science and Engineering Fair fits.","A checkpoint for choosing individual or team ISEF work; students pursuing other competitions can use the same time to find collaborators.","Upcoming fair, workshop, and submission deadlines—including other credible places an ISEF project may be shared when its rules and fit allow.","Several real ISEF project examples, examined for how they turn a broad interest into a testable question rather than as templates to copy.","An idea-starting exercise that identifies a problem, accessible evidence, likely constraint, and one-week feasibility test.","For students with teams in place: a guided start on Fort Worth Regional Science and Engineering Fair registration, even if the final idea is still developing."]'::jsonb,
    '[{"title":"Fort Worth Regional Science and Engineering Fair","url":"https://fwrsef.org/","note":"Official regional-fair information and the current registration pathway."},{"title":"Society for Science — ISEF","url":"https://www.societyforscience.org/isef/","note":"Official ISEF overview, qualification pathway, and current program information."},{"title":"Society for Science Rules Wizard","url":"https://ruleswizard.societyforscience.org/","note":"Check project-specific approval and form requirements before experimentation begins."},{"title":"Matrix Fellows opportunities","url":"/opportunities","note":"Compare workshops, fairs, and other routes without assuming one project fits every destination."}]'::jsonb,
    '', true
  )
on conflict (id) do nothing;

commit;
