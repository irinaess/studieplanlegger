-- =====================================================================
-- Studieplanlegger: datamodell (steg 2)
--
-- Kjøres én gang i Supabase: SQL Editor → lim inn → Run.
--
-- Alle tabeller har en `user_id`. Row Level Security (RLS) sørger for at
-- en innlogget bruker bare kan lese og endre sine egne rader, selv om
-- nøkkelen i nettleseren er offentlig.
-- =====================================================================


-- ---------- Innstillinger (én rad per bruker) ----------
create table public.settings (
  user_id                 uuid primary key default auth.uid() references auth.users on delete cascade,
  display_name            text not null default 'Iris',
  work_minutes            int  not null default 50 check (work_minutes between 15 and 120),
  break_minutes           int  not null default 10 check (break_minutes between 0 and 60),
  lunch_minutes           int  not null default 30 check (lunch_minutes between 0 and 120),
  lunch_start             time not null default '11:30',
  default_end_time        time not null default '16:00',
  weekly_goal_hours       numeric(4,1) not null default 40,
  exam_mode_weeks         int  not null default 4 check (exam_mode_weeks between 0 and 12),
  exam_weekly_goal_hours  numeric(4,1) not null default 45,
  semester_start          date,
  created_at              timestamptz not null default now()
);


-- ---------- Fag ----------
-- `weight` er relativ vekting (1–10). Andelen regnes ut som vekt / sum av vekter.
create table public.subjects (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users on delete cascade,
  code               text not null,
  name               text not null,
  color              text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  weight             int  not null default 3 check (weight between 1 and 10),
  weekly_goal_hours  numeric(4,1) not null default 10,
  sort_order         int  not null default 0,
  archived           boolean not null default false,
  created_at         timestamptz not null default now()
);


-- ---------- Hendelser i kalenderen ----------
-- recurring = gjentas hver uke på `weekday` (1 = mandag … 7 = søndag)
-- once      = gjelder bare på `date`
create table public.events (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users on delete cascade,
  subject_id       uuid references public.subjects on delete set null,
  title            text not null,
  location         text,
  kind             text not null check (kind in ('recurring', 'once')),
  weekday          smallint check (weekday between 1 and 7),
  date             date,
  start_time       time not null,
  end_time         time not null,
  valid_from       date,          -- for faste: første uke den gjelder
  valid_until      date,          -- for faste: siste dag den gjelder
  counts_as_study  boolean not null default true,  -- teller med i ukemålet
  source           text not null default 'manual' check (source in ('manual', 'ical')),
  external_uid     text,          -- iCal-import (steg 9), for å unngå duplikater
  created_at       timestamptz not null default now(),
  check (end_time > start_time),
  check (
    (kind = 'recurring' and weekday is not null and date is null) or
    (kind = 'once' and date is not null)
  )
);


-- ---------- Oppgaver og deloppgaver ----------
create table public.tasks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users on delete cascade,
  subject_id        uuid not null references public.subjects on delete cascade,
  title             text not null,
  type              text not null check (type in ('oblig', 'ovinger', 'lesing', 'annet')),
  estimate_minutes  int  not null default 60 check (estimate_minutes > 0),
  deadline          timestamptz,
  starred           boolean not null default false,
  status            text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  move_count        int  not null default 0,   -- hvor mange ganger oppgaven er flyttet
  notes             text,
  completed_at      timestamptz,
  created_at        timestamptz not null default now()
);

create table public.subtasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  task_id     uuid not null references public.tasks on delete cascade,
  title       text not null,
  done        boolean not null default false,
  sort_order  int not null default 0
);


-- ---------- Eksamen og temaer (eksamensmodus, steg 8) ----------
create table public.exams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  subject_id  uuid not null references public.subjects on delete cascade,
  starts_at   timestamptz not null,
  location    text
);

create table public.exam_topics (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  subject_id     uuid not null references public.subjects on delete cascade,
  title          text not null,
  confidence     smallint not null default 1 check (confidence between 1 and 5),
  importance     text not null default 'medium' check (importance in ('low', 'medium', 'high')),
  interval_days  int not null default 1,   -- spaced repetition: dager til neste repetisjon
  next_review    date,
  sort_order     int not null default 0
);

create table public.topic_reviews (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users on delete cascade,
  topic_id           uuid not null references public.exam_topics on delete cascade,
  reviewed_at        timestamptz not null default now(),
  confidence_before  smallint check (confidence_before between 1 and 5),
  confidence_after   smallint not null check (confidence_after between 1 and 5)
);


-- ---------- Dagsplaner og økter ----------
create table public.day_plans (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  date           date not null,
  start_time     time not null,
  end_time       time not null,
  energy         text not null default 'normal' check (energy in ('low', 'normal', 'high')),
  priority_text  text,          -- "Dagens prioritet"
  stopped_at     timestamptz,   -- "Jeg må gi meg for i dag"
  created_at     timestamptz not null default now(),
  unique (user_id, date)
);

-- kind: task = oppgaveøkt, subject = fagøkt (godkjent når nok tid er logget i faget),
--       review = repetisjon av eksamenstema
create table public.plan_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users on delete cascade,
  day_plan_id      uuid not null references public.day_plans on delete cascade,
  kind             text not null check (kind in ('task', 'subject', 'review')),
  subject_id       uuid not null references public.subjects on delete cascade,
  task_id          uuid references public.tasks on delete set null,
  topic_id         uuid references public.exam_topics on delete set null,
  start_at         timestamptz not null,
  end_at           timestamptz not null,
  planned_minutes  int not null,
  actual_minutes   int,
  status           text not null default 'planned'
                   check (status in ('planned', 'done', 'partial', 'skipped', 'moved')),
  check (end_at > start_at)
);


-- ---------- Faktisk tid (fra fokus-timeren eller innsjekk) ----------
create table public.time_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  subject_id  uuid not null references public.subjects on delete cascade,
  task_id     uuid references public.tasks on delete set null,
  session_id  uuid references public.plan_sessions on delete set null,
  started_at  timestamptz not null,
  ended_at    timestamptz not null,
  minutes     int not null check (minutes >= 0),
  source      text not null default 'timer' check (source in ('timer', 'manual', 'checkin')),
  check (ended_at >= started_at)
);


-- ---------- Kveldsinnsjekk og ukesrapport ----------
create table public.checkins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  date        date not null,
  note        text,
  created_at  timestamptz not null default now(),
  unique (user_id, date)
);

create table public.weekly_reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  week_start  date not null,          -- mandagen i uken
  answers     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  unique (user_id, week_start)
);


-- =====================================================================
-- Row Level Security: samme regel for alle tabeller:
-- "du kan bare se og endre rader der user_id er deg".
-- (select auth.uid()) i parentes er Supabase sin anbefaling for ytelse.
-- =====================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'settings', 'subjects', 'events', 'tasks', 'subtasks', 'exams', 'exam_topics',
    'topic_reviews', 'day_plans', 'plan_sessions', 'time_logs', 'checkins', 'weekly_reviews'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Egne rader" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create index on public.%I (user_id)', t);
  end loop;
end $$;

-- Indekser på fremmednøkler vi ofte slår opp på
create index on public.events (subject_id);
create index on public.tasks (subject_id);
create index on public.subtasks (task_id);
create index on public.exam_topics (subject_id);
create index on public.plan_sessions (day_plan_id);
create index on public.time_logs (subject_id, started_at);


-- =====================================================================
-- Ny bruker: lag innstillinger og standardfagene automatisk.
-- "security definer" betyr at funksjonen kjører med rettighetene til den
-- som laget den (admin), siden den nye brukeren ikke er logget inn ennå.
-- =====================================================================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.settings (user_id) values (new.id);

  insert into public.subjects (user_id, code, name, color, weight, weekly_goal_hours, sort_order) values
    (new.id, 'MAT111',  'Kalkulus',      '#72383D', 4, 15, 1),
    (new.id, 'ITØK101', 'Mikroøkonomi',  '#AC9C8D', 4, 15, 2),
    (new.id, 'INFO132', 'Programmering', '#3E4A5C', 2, 10, 3);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
