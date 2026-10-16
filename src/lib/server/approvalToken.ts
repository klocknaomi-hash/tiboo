/**
 * Signed tokens for actions waiting on the user's confirmation.
 *
 * When the agent wants to run a sensitive tool (send an email, create an
 * event…), the paused run state is signed with TIBOO_SERVER_SECRET and sent
 * to the app. The app can only send it back to approve or refuse it: any
 * change to the action, another user, or an expired token is rejected.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { HttpError } from './auth';

const TTL_MS = 15 * 60 * 1000;

export interface ApprovalMeta {
  persona?: { name?: string; role?: string };
  timezone?: string;
}

interface ApprovalPayload {
  userId: string;
  state: string;
  meta: ApprovalMeta;
  expiresAt: number;
}

function secret(): string {
  const s = process.env.TIBOO_SERVER_SECRET;
  if (!s || s.length < 32) {
    throw new HttpError(500, 'TIBOO_SERVER_SECRET manquant (32 caractères minimum).');
  }
  return s;
}

function sign(data: string): string {
  return createHmac('sha256', secret()).update(data).digest('base64url');
}

export function createApprovalToken(userId: string, state: string, meta: ApprovalMeta = {}): string {
  const payload: ApprovalPayload = { userId, state, meta, expiresAt: Date.now() + TTL_MS };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${data}.${sign(data)}`;
}

export function readApprovalToken(
  token: string,
  userId: string
): { state: string; meta: ApprovalMeta } {
  const [data, signature] = token.split('.');
  if (!data || !signature) throw new HttpError(400, 'Demande de confirmation invalide.');

  const expected = Buffer.from(sign(data));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    throw new HttpError(400, 'Demande de confirmation invalide.');
  }

  const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as ApprovalPayload;
  if (payload.userId !== userId) throw new HttpError(403, 'Cette action ne t’appartient pas.');
  if (Date.now() > payload.expiresAt) {
    throw new HttpError(410, 'Cette demande a expiré. Redemande l’action à ton agent.');
  }
  return { state: payload.state, meta: payload.meta || {} };
}
