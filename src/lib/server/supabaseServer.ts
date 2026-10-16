/**
 * Server-only Supabase clients (Expo Router API routes).
 *
 * - createUserClient(jwt): acts AS the signed-in user, so every query goes
 *   through Row Level Security exactly like the app would.
 * - createServiceClient(): service role, bypasses RLS. Only used by the
 *   scheduled-task runner (cron), never with user-supplied ids unchecked.
 *
 * Never import this file from app screens: it reads server secrets.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

function supabaseUrl(): string {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('SUPABASE_URL manquant côté serveur.');
  return url;
}

function anonKey(): string {
  const key = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error('SUPABASE_ANON_KEY manquant côté serveur.');
  return key;
}

const serverAuthOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
};

export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl(), anonKey(), {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: serverAuthOptions,
  });
}

export function createServiceClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant côté serveur.');
  return createClient(supabaseUrl(), serviceKey, { auth: serverAuthOptions });
}
