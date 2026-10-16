/**
 * Request authentication for API routes.
 *
 * Every /api route requires the caller's Supabase access token in
 * `Authorization: Bearer <token>`. The token is verified with Supabase
 * (not just decoded), and the returned client acts as that user.
 */

import { timingSafeEqual } from 'crypto';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createUserClient } from './supabaseServer';

export interface AuthenticatedRequest {
  user: User;
  db: SupabaseClient;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error('[api]', err);
  return Response.json({ error: 'Erreur interne du serveur Tiboo.' }, { status: 500 });
}

export async function requireUser(request: Request): Promise<AuthenticatedRequest> {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    throw new HttpError(401, 'Connexion requise pour utiliser l’agent Tiboo.');
  }

  const db = createUserClient(token);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) {
    throw new HttpError(401, 'Session expirée ou invalide. Reconnecte-toi.');
  }
  return { user: data.user, db };
}

/** Constant-time check of the shared secret used by the scheduled-task cron. */
export function isCronRequest(request: Request): boolean {
  const expected = process.env.TIBOO_CRON_SECRET;
  const given = request.headers.get('x-tiboo-cron-secret');
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
