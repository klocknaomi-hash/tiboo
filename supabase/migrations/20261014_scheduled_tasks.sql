-- ==============================================================================
-- TIBOO / MUSE AI - MIGRATION: SCHEDULED RECURRING TASKS & EXECUTIONS (PG_CRON)
-- ==============================================================================
-- Run this script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New query -> Paste & Run
-- ==============================================================================

-- 1. Enable pg_cron and pg_net extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Table "scheduled_tasks"
create table if not exists public.scheduled_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade default auth.uid(),
  agent_id uuid default null,
  title text,
  instruction text not null,
  schedule text not null default '0 9 * * *', -- Standard 5-part cron, e.g. "0 9 * * *"
  timezone text not null default 'Europe/Paris',
  is_active boolean not null default true,
  next_run_at timestamptz not null default now(),
  last_run_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scheduled_tasks enable row level security;

-- RLS Policies for scheduled_tasks
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

-- 3. Table "task_executions"
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

-- RLS Policies for task_executions
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

-- 4. Indexes for fast query lookup
create index if not exists idx_scheduled_tasks_user_id on public.scheduled_tasks (user_id);
create index if not exists idx_scheduled_tasks_active_next on public.scheduled_tasks (is_active, next_run_at);
create index if not exists idx_task_executions_task_id on public.task_executions (task_id);
create index if not exists idx_task_executions_created_at on public.task_executions (created_at desc);

-- 5. Trigger Function for pg_cron to discover due tasks & trigger Edge Function
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

  for task in
    select id, instruction, schedule, timezone
    from public.scheduled_tasks
    where is_active = true
      and next_run_at <= now()
  loop
    -- Queue execution entry
    insert into public.task_executions (task_id, status, created_at)
    values (task.id, 'queued', now());

    -- Prevent immediate duplicate dispatch in next minute
    update public.scheduled_tasks
    set last_run_at = now(),
        updated_at = now()
    where id = task.id;

    -- Dispatched via async HTTP POST to Supabase Edge Function
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

-- 6. Schedule with pg_cron: every 1 minute ('* * * * *') or every 15 minutes ('*/15 * * * *')
do $$
begin
  if exists (select 1 from cron.job where jobname = 'tiboo-due-scheduled-tasks-runner') then
    perform cron.unschedule('tiboo-due-scheduled-tasks-runner');
  end if;
exception
  when undefined_table then null;
end $$;

select cron.schedule(
  'tiboo-due-scheduled-tasks-runner',
  '* * * * *',
  $$ select public.trigger_due_scheduled_tasks(); $$
);
