-- ==============================================================================
-- Migration: Fix Supabase Security Linter Issues
-- 1. rls_disabled_in_public on public.users
-- 2. sensitive_columns_exposed on public.users (token column)
-- ==============================================================================

do $$
begin
  if exists (
    select from pg_tables
    where schemaname = 'public' and tablename = 'users'
  ) then

    -- 1. Enable Row Level Security (Fixes: rls_disabled_in_public)
    alter table public.users enable row level security;

    -- 2. Revoke all permissions from unauthenticated (anon) PostgREST role
    revoke all on public.users from anon;

    -- 3. Reset existing policies to avoid conflicts
    drop policy if exists "Users can read own user data" on public.users;
    drop policy if exists "Users can update own user data" on public.users;
    drop policy if exists "Users can insert own user data" on public.users;
    drop policy if exists "Users can read own data" on public.users;
    drop policy if exists "Users can update own data" on public.users;
    drop policy if exists "Users can insert own data" on public.users;

    -- 4. Apply strict user isolation policies for authenticated users
    create policy "Users can read own user data"
      on public.users for select
      to authenticated
      using (
        (auth.uid() is not null and id::text = auth.uid()::text)
        or (auth.jwt()->>'email' is not null and email = auth.jwt()->>'email')
      );

    create policy "Users can update own user data"
      on public.users for update
      to authenticated
      using (
        (auth.uid() is not null and id::text = auth.uid()::text)
        or (auth.jwt()->>'email' is not null and email = auth.jwt()->>'email')
      );

    create policy "Users can insert own user data"
      on public.users for insert
      to authenticated
      with check (
        (auth.uid() is not null and id::text = auth.uid()::text)
        or (auth.jwt()->>'email' is not null and email = auth.jwt()->>'email')
      );

    -- 5. Fix sensitive_columns_exposed: revoke read access to token column
    if exists (
      select from information_schema.columns
      where table_schema = 'public' and table_name = 'users' and column_name = 'token'
    ) then
      revoke select (token) on public.users from anon, authenticated;
    end if;

  end if;
end $$;
