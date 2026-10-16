/**
 * POST /api/chat
 *
 * Header: Authorization: Bearer <Supabase access token>
 * Body:   { message: string, history?: {role, content}[], persona?: {name, role}, timezone?: string }
 * Reply:  { reply, suggestedActions, provider, model, requiresConfirmation? }
 *
 * The provider is chosen on the server (DEFAULT_AI_PROVIDER). Errors are
 * returned as errors: the app never shows an invented answer.
 */

import { getAIProvider } from '@/lib/ai';
import { errorResponse, HttpError, requireUser } from '@/lib/server/auth';
import { enforceRateLimit } from '@/lib/server/rateLimit';
import type { ChatTurn } from '@/lib/agent';

const MAX_MESSAGE = 4000;

function cleanHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (t): t is ChatTurn =>
        t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string'
    )
    .slice(-20)
    .map((t) => ({ role: t.role, content: t.content.slice(0, MAX_MESSAGE) }));
}

export async function POST(request: Request) {
  try {
    const { user, db } = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) throw new HttpError(400, 'Le message est vide.');
    if (message.length > MAX_MESSAGE) throw new HttpError(400, 'Message trop long (4000 caractères maximum).');

    enforceRateLimit(user.id);

    const provider = getAIProvider();
    const reply = await provider.ask({
      userId: user.id,
      db,
      message,
      history: cleanHistory(body?.history),
      persona: {
        name: typeof body?.persona?.name === 'string' ? body.persona.name.slice(0, 40) : undefined,
        role: typeof body?.persona?.role === 'string' ? body.persona.role.slice(0, 80) : undefined,
      },
      timezone: typeof body?.timezone === 'string' ? body.timezone : undefined,
    });

    return Response.json({
      reply: reply.message,
      suggestedActions: reply.suggestedActions,
      provider: reply.provider,
      model: reply.model,
      requiresConfirmation: reply.requiresConfirmation,
    });
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err);
    console.error('[api/chat]', err);
    return Response.json(
      { error: (err as Error)?.message || "L'agent n'a pas pu répondre." },
      { status: 502 }
    );
  }
}
