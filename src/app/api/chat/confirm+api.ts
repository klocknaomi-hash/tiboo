/**
 * POST /api/chat/confirm
 *
 * Header: Authorization: Bearer <Supabase access token>
 * Body:   { token: string, approve: boolean }
 *
 * Approves or refuses an action the agent paused for confirmation. The
 * token is signed by the server and bound to this user, so the app cannot
 * change the action it is approving.
 */

import { resumeAgent } from '@/lib/agent';
import { errorResponse, HttpError, requireUser } from '@/lib/server/auth';
import { enforceRateLimit } from '@/lib/server/rateLimit';

export async function POST(request: Request) {
  try {
    const { user, db } = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    if (typeof body?.token !== 'string' || typeof body?.approve !== 'boolean') {
      throw new HttpError(400, 'Demande de confirmation invalide.');
    }
    enforceRateLimit(user.id);

    const reply = await resumeAgent({ userId: user.id, db, token: body.token, approve: body.approve });
    return Response.json({
      reply: reply.message,
      suggestedActions: reply.suggestedActions,
      model: reply.model,
      requiresConfirmation: reply.requiresConfirmation,
    });
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err);
    console.error('[api/chat/confirm]', err);
    return Response.json(
      { error: (err as Error)?.message || "L'action n'a pas pu être traitée." },
      { status: 502 }
    );
  }
}
