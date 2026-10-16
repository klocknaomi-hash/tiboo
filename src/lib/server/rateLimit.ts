/**
 * Per-user message limit for the AI routes (cost control).
 *
 * In-memory sliding window: good enough for a single server instance.
 * With several instances, move this counter to Supabase or Redis.
 */

import { HttpError } from './auth';

const windowMs = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

export function enforceRateLimit(userId: string): void {
  const limit = Number(process.env.TIBOO_MAX_MESSAGES_PER_HOUR || 30);
  const now = Date.now();
  const recent = (hits.get(userId) || []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    throw new HttpError(
      429,
      `Limite atteinte : ${limit} messages par heure. Réessaie un peu plus tard.`
    );
  }
  recent.push(now);
  hits.set(userId, recent);
}
