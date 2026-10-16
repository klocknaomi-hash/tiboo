-- =============================================================================
-- Tiboo — Security hardening (2026-10-16)
--
-- 1. Row Level Security: a row without an owner (user_id is null) was readable
--    and writable by EVERY user ("... or user_id is null"). Policies are now
--    strictly "auth.uid() = user_id". Ownerless rows are not deleted; they
--    simply become invisible to app users.
-- 2. Scheduler: pg_cron no longer re-dispatches the same task every minute
--    and no longer leaves "queued" executions behind. The Tiboo server
--    records the real execution and computes the next run.
-- =============================================================================

-- ---------- chat_threads ----------
drop policy if exists "Users can read their own chat threads" on public.chat_threads;
create policy "Users can read their own chat threads"
  on public.chat_threads for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own chat threads" on public.chat_threads;
create policy "Users can insert their own chat threads"
  on public.chat_threads for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own chat threads" on public.chat_threads;
create policy "Users can update their own chat threads"
  on public.chat_threads for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own chat threads" on public.chat_threads;
create policy "Users can delete their own chat threads"
  on public.chat_threads for delete using (auth.uid() = user_id);

-- ---------- chat_messages ----------
drop policy if exists "Users can read their own chat messages" on public.chat_messages;
create policy "Users can read their own chat messages"
  on public.chat_messages for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own chat messages" on public.chat_messages;
create policy "Users can insert their own chat messages"
  on public.chat_messages for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own chat messages" on public.chat_messages;
create policy "Users can update their own chat messages"
  on public.chat_messages for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own chat messages" on public.chat_messages;
create policy "Users can delete their own chat messages"
  on public.chat_messages for delete using (auth.uid() = user_id);

-- ---------- scheduled_tasks ----------
drop policy if exists "Users can read their own scheduled tasks" on public.scheduled_tasks;
create policy "Users can read their own scheduled tasks"
  on public.scheduled_tasks for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own scheduled tasks" on public.scheduled_tasks;
create policy "Users can insert their own scheduled tasks"
  on public.scheduled_tasks for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own scheduled tasks" on public.scheduled_tasks;
create policy "Users can update their own scheduled tasks"
  on public.scheduled_tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own scheduled tasks" on public.scheduled_tasks;
create policy "Users can delete their own scheduled tasks"
  on public.scheduled_tasks for delete using (auth.uid() = user_id);

-- ---------- task_executions (owned through their task) ----------
drop policy if exists "Users can read their own task executions" on public.task_executions;
create policy "Users can read their own task executions"
  on public.task_executions for select
  using (task_id in (select id from public.scheduled_tasks where user_id = auth.uid()));
drop policy if exists "Users can insert their own task executions" on public.task_executions;
create policy "Users can insert their own task executions"
  on public.task_executions for insert
  with check (task_id in (select id from public.scheduled_tasks where user_id = auth.uid()));
drop policy if exists "Users can update their own task executions" on public.task_executions;
create policy "Users can update their own task executions"
  on public.task_executions for update
  using (task_id in (select id from public.scheduled_tasks where user_id = auth.uid()));

-- ---------- scheduler ----------
create or replace function public.trigger_due_scheduled_tasks()
returns void as $$
declare
  task record;
  supabase_project_url text := current_setting('app.settings.supabase_url', true);
  service_role_key text := current_setting('app.settings.service_role_key', true);
begin
  if supabase_project_url is null or service_role_key is null then
    raise notice 'app.settings.supabase_url / service_role_key not set: scheduled tasks not dispatched';
    return;
  end if;

  for task in
    select id from public.scheduled_tasks
    where is_active = true and user_id is not null and next_run_at <= now()
    for update skip locked
  loop
    -- Provisional claim so the next cron tick does not dispatch it again;
    -- the Tiboo server sets the real next_run_at when it runs the task.
    update public.scheduled_tasks
      set next_run_at = now() + interval '1 hour', updated_at = now()
      where id = task.id;

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
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.trigger_due_scheduled_tasks() from public, anon, authenticated;
