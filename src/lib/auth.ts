/**
 * Auth Helpers
 *
 * Full Supabase Authentication suite:
 * - Email / Password sign-in & sign-up
 * - Google OAuth sign-in (Native via WebBrowser & Web redirect)
 * - Automatic profile synchronization into DB (`profiles` and `users`)
 * - Sign out & session retrieval
 */

import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at?: string;
}

/**
 * Returns the proper OAuth redirect URI:
 * - On Web: http://localhost:8081/auth/callback (or window.location.origin)
 * - In Expo Go: exp://<host>/--/auth/callback
 * - In Standalone / Installed App: tiboo://auth/callback
 */
export const getRedirectUrl = () => {
  return makeRedirectUri({ scheme: 'tiboo', path: 'auth/callback' });
};

/** Extracts authorization code (?code=...) from redirect URL */
function extractCodeFromUrl(url: string): string | null {
  try {
    const questionMarkIndex = url.indexOf('?');
    if (questionMarkIndex !== -1) {
      const queryString = url.slice(questionMarkIndex + 1).split('#')[0];
      const params = new URLSearchParams(queryString);
      const code = params.get('code');
      if (code) return code;
    }
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const hashString = url.slice(hashIndex + 1);
      const params = new URLSearchParams(hashString);
      const code = params.get('code');
      if (code) return code;
    }
  } catch (err) {
    console.warn('[Auth] Failed to extract code from URL:', err);
  }
  return null;
}

/** Extracts access & refresh tokens (#access_token=...) from redirect URL */
function extractTokensFromUrl(url: string): { accessToken: string | null; refreshToken: string } {
  try {
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const hashString = url.slice(hashIndex + 1);
      const params = new URLSearchParams(hashString);
      return {
        accessToken: params.get('access_token'),
        refreshToken: params.get('refresh_token') ?? '',
      };
    }
    const questionMarkIndex = url.indexOf('?');
    if (questionMarkIndex !== -1) {
      const queryString = url.slice(questionMarkIndex + 1);
      const params = new URLSearchParams(queryString);
      return {
        accessToken: params.get('access_token'),
        refreshToken: params.get('refresh_token') ?? '',
      };
    }
  } catch (err) {
    console.warn('[Auth] Failed to extract tokens from URL:', err);
  }
  return { accessToken: null, refreshToken: '' };
}

/**
 * Sign in with Email and Password
 */
export async function signInWithEmail(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error('Aucune session active reçue');
  }

  if (data.user) {
    await saveUserProfile(data.user);
  }

  return data.session;
}

/**
 * Sign up a new user with Email and Password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string
): Promise<{ user: User | null; session: Session | null }> {
  const displayName = name?.trim() || email.split('@')[0];
  const redirectTo = getRedirectUrl();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        full_name: displayName,
        name: displayName,
      },
    },
  });

  if (error) {
    throw error;
  }

  if (data.user) {
    await saveUserProfile(data.user, displayName);
  }

  return { user: data.user, session: data.session };
}

/**
 * Send password reset email with redirect to app
 */
export async function resetPasswordForEmail(email: string): Promise<void> {
  const redirectTo = getRedirectUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) throw error;
}

/**
 * Sign in via Magic Link / OTP with redirect to app
 */
export async function signInWithOtp(email: string): Promise<void> {
  const redirectTo = getRedirectUrl();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
    },
  });
  if (error) throw error;
}

/**
 * Sign in with Google (OAuth)
 */
export async function signInWithGoogle(): Promise<Session | null> {
  const redirectTo = getRedirectUrl();
  console.log('[Auth] Google OAuth redirectTo:', redirectTo);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    console.error('[Auth] supabase signInWithOAuth error:', error);
    throw error;
  }

  if (!data?.url) {
    throw new Error('Aucune URL de connexion renvoyée par Supabase');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  // Gérer les cas cancel / dismiss sans planter
  if (result.type === 'cancel' || result.type === 'dismiss') {
    console.log('[Auth] Connexion Google annulée ou fermée par l’utilisateur.');
    return null;
  }

  if (result.type !== 'success' || !result.url) {
    console.warn('[Auth] Session de navigateur non finalisée. Type:', result.type);
    return null;
  }

  // Débogage temporaire de l'URL retournée (tokens masqués)
  const sanitizedUrl = result.url
    .replace(/([?&#]access_token=)[^&#]+/gi, '$1***')
    .replace(/([?&#]refresh_token=)[^&#]+/gi, '$1***')
    .replace(/([?&#]code=)[^&#]+/gi, '$1***');
  console.log('[Auth] URL retournée par le navigateur:', sanitizedUrl);

  // Extraire les paramètres de la query string (?...) et du fragment hash (#...)
  const params = new URLSearchParams();
  const queryIndex = result.url.indexOf('?');
  if (queryIndex !== -1) {
    const queryPart = result.url.slice(queryIndex + 1).split('#')[0];
    new URLSearchParams(queryPart).forEach((val, key) => params.set(key, val));
  }
  const hashIndex = result.url.indexOf('#');
  if (hashIndex !== -1) {
    const hashPart = result.url.slice(hashIndex + 1);
    new URLSearchParams(hashPart).forEach((val, key) => params.set(key, val));
  }

  // Gestion des erreurs retournées dans l'URL
  const authError = params.get('error');
  const authErrorDesc = params.get('error_description');
  if (authError || authErrorDesc) {
    const message = authErrorDesc || authError || 'Erreur lors de la connexion Google';
    console.error('[Auth] Erreur OAuth retournée dans l’URL:', message);
    throw new Error(message);
  }

  // 1. Flow PKCE avec Authorization Code (?code=...)
  const code = params.get('code');
  if (code) {
    console.log('[Auth] Échange du code d’autorisation contre une session Supabase...');
    const { data: sessionData, error: sessionError } =
      await supabase.auth.exchangeCodeForSession(code);
    if (sessionError) {
      console.error('[Auth] exchangeCodeForSession error:', sessionError);
      throw sessionError;
    }
    if (sessionData.user) {
      await saveUserProfile(sessionData.user);
    }
    return sessionData.session;
  }

  // 2. Flow Implicit avec access_token et refresh_token (#access_token=...)
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    console.log('[Auth] Initialisation de la session via access_token et refresh_token...');
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) {
      console.error('[Auth] setSession error:', sessionError);
      throw sessionError;
    }
    if (sessionData.user) {
      await saveUserProfile(sessionData.user);
    }
    return sessionData.session;
  }

  // 3. Fallback : vérifier si la session a été enregistrée en arrière-plan
  const { data: currentSession } = await supabase.auth.getSession();
  if (currentSession?.session) {
    if (currentSession.session.user) {
      await saveUserProfile(currentSession.session.user);
    }
    return currentSession.session;
  }

  throw new Error('Aucun jeton de session ou code valide reçu après la connexion.');
}

/**
 * Sign in anonymously (Dev bypass mode)
 */
export async function signInAnonymously(): Promise<Session> {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error('[Auth] supabase signInAnonymously error:', error);
    throw error;
  }
  if (!data.session) {
    throw new Error('Aucune session anonyme retournée par Supabase');
  }
  if (data.user) {
    await saveUserProfile(data.user, 'Invité Dev');
  }
  return data.session;
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get current session
 */
export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Step 4 of the Auth & DB setup: write the signed-in user's info to `profiles` (and `users`).
 */
export async function saveUserProfile(
  userParam?: User,
  nameOverride?: string,
  avatarUrlOverride?: string | null
): Promise<void> {
  try {
    let user = userParam;
    if (!user) {
      const { data } = await supabase.auth.getUser();
      user = data.user ?? undefined;
    }
    if (!user) return;

    const name =
      nameOverride?.trim() ||
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      user.email?.split('@')[0] ||
      'New user';

    const avatarUrl =
      avatarUrlOverride !== undefined
        ? avatarUrlOverride
        : (user.user_metadata?.avatar_url as string | undefined) ??
          (user.user_metadata?.picture as string | undefined) ??
          null;

    // 1. Primary table: public.profiles (uuid id primary key)
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        name,
        email: user.email ?? null,
        avatar_url: avatarUrl,
      },
      { onConflict: 'id' }
    );

    if (profileError && profileError.code !== 'PGRST205') {
      console.warn('[Auth] profiles upsert notice:', profileError.message);
    }

    // 2. Compatibility sync with public.users if table exists
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (!existingUser && user.email) {
        await supabase.from('users').insert({
          name,
          email: user.email,
        });
      }
    } catch {
      // Ignored if users table schema differs or doesn't exist
    }
  } catch (err) {
    console.warn('[Auth] Could not save user profile:', err);
  }
}

/**
 * Retrieve user profile from DB (or fallback to auth metadata)
 */
export async function getUserProfile(userId?: string): Promise<UserProfile | null> {
  try {
    let uid = userId;
    let authUser: User | null = null;

    if (!uid) {
      const { data } = await supabase.auth.getUser();
      authUser = data.user;
      uid = authUser?.id;
    }

    if (!uid) return null;

    // Try reading from public.profiles
    const { data: profileRow, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (!error && profileRow) {
      return {
        id: profileRow.id,
        name: profileRow.name ?? null,
        email: profileRow.email ?? null,
        avatar_url: profileRow.avatar_url ?? null,
        created_at: profileRow.created_at,
      };
    }

    // Fallback: build profile from auth user metadata
    if (!authUser) {
      const { data } = await supabase.auth.getUser();
      authUser = data.user;
    }

    if (authUser && authUser.id === uid) {
      return {
        id: authUser.id,
        name:
          (authUser.user_metadata?.full_name as string | undefined) ||
          (authUser.user_metadata?.name as string | undefined) ||
          authUser.email?.split('@')[0] ||
          'User',
        email: authUser.email ?? null,
        avatar_url:
          (authUser.user_metadata?.avatar_url as string | undefined) ||
          (authUser.user_metadata?.picture as string | undefined) ||
          null,
      };
    }

    return null;
  } catch (err) {
    console.warn('[Auth] getUserProfile fallback:', err);
    return null;
  }
}
