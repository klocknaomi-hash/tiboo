/**
 * Calls to Tiboo's server routes (/api/...).
 *
 * - On the web, the API is served from the same origin as the app.
 * - On iOS / Android, set EXPO_PUBLIC_API_URL to the deployed server
 *   (e.g. https://tiboo.expo.app); in development, Expo's dev server is used.
 * - Every call carries the user's Supabase access token.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

function apiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (configured) return configured;
  if (Platform.OS === 'web') return '';
  // Development on a phone: same host as the Expo dev server.
  const hostUri = Constants.expoConfig?.hostUri;
  if (__DEV__ && hostUri) return `http://${hostUri}`;
  throw new ApiError(
    0,
    "L'adresse du serveur Tiboo n'est pas configurée (EXPO_PUBLIC_API_URL)."
  );
}

export async function apiFetch<T = any>(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new ApiError(401, 'Connecte-toi avec un compte Tiboo pour utiliser l’agent IA.');
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method: init.method || (init.body ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, 'Le serveur Tiboo est injoignable. Vérifie ta connexion.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, payload?.error || `Erreur du serveur (${response.status}).`);
  }
  return payload as T;
}
