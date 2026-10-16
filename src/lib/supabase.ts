/**
 * Supabase Client
 *
 * Single shared client used everywhere in the app for Database & Auth.
 * Sessions are persisted on-device with AsyncStorage so a signed-in user
 * stays signed in across app restarts.
 *
 * - During web server rendering there is no `window`: no storage is used then.
 * - If the Supabase keys are missing, the app still opens and
 *   `isSupabaseConfigured` is false (the sign-in screen says so) instead of
 *   crashing at startup.
 */

import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY manquants : copie .env.example vers .env.'
  );
}

const isServerRender = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase = createClient(
  supabaseUrl || 'https://supabase-non-configure.invalid',
  supabaseAnonKey || 'cle-manquante',
  {
    auth: {
      storage: isServerRender ? undefined : AsyncStorage,
      autoRefreshToken: !isServerRender,
      persistSession: !isServerRender,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  }
);

if (!isServerRender) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
