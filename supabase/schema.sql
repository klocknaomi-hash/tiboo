-- ==============================================================================
-- TIBOO / MUSE AI - SUPABASE DATABASE SCHEMA & POLICIES
-- ==============================================================================
-- Run this script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New query -> Paste & Run
--
-- This script sets up:
-- 1. `profiles` table (linked to auth.users) with full Row Level Security (RLS)
-- 2. Automatic trigger function `handle_new_user()` to populate `profiles` on signup
-- 3. `messages` table for chat persistence with RLS
-- 4. RLS protection for `users` table if present
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Profiles Table (Recommended user table linked 1:1 with Supabase Auth)
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policies for profiles
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 2. Automatic Trigger: populate `profiles` when user signs up (Email or Google)
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1),
      'User'
    ),
    new.email,
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      null
    )
  )
  on conflict (id) do update set
    name = coalesce(excluded.name, public.profiles.name),
    email = coalesce(excluded.email, public.profiles.email),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 3. Chat Threads Table (Conversations metadata: Main Chat & SideChats)
-- ------------------------------------------------------------------------------
create table if not exists public.chat_threads (
  id text primary key, -- unique threadId
  user_id uuid references auth.users (id) on delete cascade default auth.uid(),
  title text not null default 'Nouvelle discussion',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chat_threads enable row level security;

drop policy if exists "Users can read their own chat threads" on public.chat_threads;
create policy "Users can read their own chat threads"
  on public.chat_threads for select
  using (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can insert their own chat threads" on public.chat_threads;
create policy "Users can insert their own chat threads"
  on public.chat_threads for insert
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can update their own chat threads" on public.chat_threads;
create policy "Users can update their own chat threads"
  on public.chat_threads for update
  using (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can delete their own chat threads" on public.chat_threads;
create policy "Users can delete their own chat threads"
  on public.chat_threads for delete
  using (auth.uid() = user_id or user_id is null);

-- ------------------------------------------------------------------------------
-- 4. Chat Messages Table (Messages per threadId: Main Chat + SideChats)
-- Columns: id, threadId, role, content, createdAt (+ user_id for RLS)
-- ------------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  "threadId" text not null,
  role text not null check (role in ('user', 'assistant', 'system', 'agent')),
  content text not null,
  "createdAt" timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete cascade default auth.uid()
);

alter table public.chat_messages enable row level security;

drop policy if exists "Users can read their own chat messages" on public.chat_messages;
create policy "Users can read their own chat messages"
  on public.chat_messages for select
  using (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can insert their own chat messages" on public.chat_messages;
create policy "Users can insert their own chat messages"
  on public.chat_messages for insert
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can update their own chat messages" on public.chat_messages;
create policy "Users can update their own chat messages"
  on public.chat_messages for update
  using (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can delete their own chat messages" on public.chat_messages;
create policy "Users can delete their own chat messages"
  on public.chat_messages for delete
  using (auth.uid() = user_id or user_id is null);

-- Performance indexes
create index if not exists idx_chat_messages_thread_id on public.chat_messages ("threadId");
create index if not exists idx_chat_messages_user_id on public.chat_messages (user_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages ("createdAt" desc);
create index if not exists idx_chat_threads_user_id on public.chat_threads (user_id);
create index if not exists idx_chat_threads_updated_at on public.chat_threads (updated_at desc);

-- ------------------------------------------------------------------------------
-- 5. Legacy Messages Table (Maintained for backwards-compatibility)
-- ------------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  chat_id uuid not null default gen_random_uuid(),
  sender text not null check (sender in ('user', 'agent', 'system')),
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

drop policy if exists "Users can read their own messages" on public.messages;
create policy "Users can read their own messages"
  on public.messages for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own messages" on public.messages;
create policy "Users can insert their own messages"
  on public.messages for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own messages" on public.messages;
create policy "Users can delete their own messages"
  on public.messages for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6. Scheduled Tasks Table (Recurring Autonomous Agent Tasks)
-- ------------------------------------------------------------------------------
create table if not exists public.scheduled_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade default auth.uid(),
  agent_id uuid default null,
  title text,
  instruction text not null,
  schedule text not null default '0 9 * * *', -- Cron expression, ex: "0 9 * * *"
  timezone text not null default 'Europe/Paris',
  is_active boolean not null default true,
  next_run_at timestamptz not null default now(),
  last_run_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scheduled_tasks enable row level security;

drop policy if exists "Users can read their own scheduled tasks" on public.scheduled_tasks;
create policy "Users can read their own scheduled tasks"
  on public.scheduled_tasks for select
  using (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can insert their own scheduled tasks" on public.scheduled_tasks;
create policy "Users can insert their own scheduled tasks"
  on public.scheduled_tasks for insert
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can update their own scheduled tasks" on public.scheduled_tasks;
create policy "Users can update their own scheduled tasks"
  on public.scheduled_tasks for update
  using (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can delete their own scheduled tasks" on public.scheduled_tasks;
create policy "Users can delete their own scheduled tasks"
  on public.scheduled_tasks for delete
  using (auth.uid() = user_id or user_id is null);

-- ------------------------------------------------------------------------------
-- 7. Task Executions Table (History of Scheduled Runs)
-- ------------------------------------------------------------------------------
create table if not exists public.task_executions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.scheduled_tasks (id) on delete cascade,
  status text not null check (status in ('queued', 'running', 'completed', 'failed')) default 'queued',
  result jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  error text
);

alter table public.task_executions enable row level security;

drop policy if exists "Users can read their own task executions" on public.task_executions;
create policy "Users can read their own task executions"
  on public.task_executions for select
  using (
    task_id in (
      select id from public.scheduled_tasks
      where auth.uid() = user_id or user_id is null
    )
  );

drop policy if exists "Users can insert their own task executions" on public.task_executions;
create policy "Users can insert their own task executions"
  on public.task_executions for insert
  with check (
    task_id in (
      select id from public.scheduled_tasks
      where auth.uid() = user_id or user_id is null
    )
  );

drop policy if exists "Users can update their own task executions" on public.task_executions;
create policy "Users can update their own task executions"
  on public.task_executions for update
  using (
    task_id in (
      select id from public.scheduled_tasks
      where auth.uid() = user_id or user_id is null
    )
  );

-- Performance indexes for scheduled_tasks and task_executions
create index if not exists idx_scheduled_tasks_user_id on public.scheduled_tasks (user_id);
create index if not exists idx_scheduled_tasks_active_next on public.scheduled_tasks (is_active, next_run_at);
create index if not exists idx_task_executions_task_id on public.task_executions (task_id);
create index if not exists idx_task_executions_created_at on public.task_executions (created_at desc);

-- ------------------------------------------------------------------------------
-- 8. Supabase pg_cron + pg_net Background Trigger Function
-- ------------------------------------------------------------------------------
-- Run this block in Supabase Dashboard -> Database -> Extensions / SQL Editor:
-- Ensure "pg_cron" and "pg_net" extensions are enabled.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.trigger_due_scheduled_tasks()
returns void as $$
declare
  task record;
  supabase_project_url text;
  service_role_key text;
begin
  supabase_project_url := coalesce(
    current_setting('app.settings.supabase_url', true),
    'https://<your-project-ref>.supabase.co'
  );
  service_role_key := coalesce(
    current_setting('app.settings.service_role_key', true),
    '<SUPABASE_SERVICE_ROLE_KEY>'
  );

  -- Scan for tasks that are due and active
  for task in
    select id, instruction, schedule, timezone
    from public.scheduled_tasks
    where is_active = true
      and next_run_at <= now()
  loop
    -- 1. Create a queued execution entry
    insert into public.task_executions (task_id, status, created_at)
    values (task.id, 'queued', now());

    -- 2. Bump last_run_at to avoid re-triggering within the same minute
    update public.scheduled_tasks
    set last_run_at = now(),
        updated_at = now()
    where id = task.id;

    -- 3. Trigger the Supabase Edge Function asynchronously
    perform net.http_post(
      url := supabase_project_url || '/functions/v1/execute-scheduled-task',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object('taskId', task.id)
    );
  end loop;
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------------------------
-- 9. Schedule the pg_cron job (Runs every minute or every 15 minutes)
-- ------------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'tiboo-due-scheduled-tasks-runner') then
    perform cron.unschedule('tiboo-due-scheduled-tasks-runner');
  end if;
exception
  when undefined_table then null;
end $$;

-- Scheduled to run every minute ('* * * * *') or every 15 minutes ('*/15 * * * *')
select cron.schedule(
  'tiboo-due-scheduled-tasks-runner',
  '* * * * *',
  $$ select public.trigger_due_scheduled_tasks(); $$
);

-- ------------------------------------------------------------------------------
-- 10. Security Hardening for public.users (Fixes Supabase Linter 0013 & 0023)
-- ------------------------------------------------------------------------------
do $$
begin
  if exists (
    select from pg_tables
    where schemaname = 'public' and tablename = 'users'
  ) then
    -- Enable RLS
    alter table public.users enable row level security;
    revoke all on public.users from anon;

    drop policy if exists "Users can read own user data" on public.users;
    create policy "Users can read own user data"
      on public.users for select
      to authenticated
      using (
        (auth.uid() is not null and id::text = auth.uid()::text)
        or (auth.jwt()->>'email' is not null and email = auth.jwt()->>'email')
      );

    drop policy if exists "Users can update own user data" on public.users;
    create policy "Users can update own user data"
      on public.users for update
      to authenticated
      using (
        (auth.uid() is not null and id::text = auth.uid()::text)
        or (auth.jwt()->>'email' is not null and email = auth.jwt()->>'email')
      );

    drop policy if exists "Users can insert own user data" on public.users;
    create policy "Users can insert own user data"
      on public.users for insert
      to authenticated
      with check (
        (auth.uid() is not null and id::text = auth.uid()::text)
        or (auth.jwt()->>'email' is not null and email = auth.jwt()->>'email')
      );

    -- Protect sensitive token column if present
    if exists (
      select from information_schema.columns
      where table_schema = 'public' and table_name = 'users' and column_name = 'token'
    ) then
      revoke select (token) on public.users from anon, authenticated;
    end if;
  end if;
end $$;


