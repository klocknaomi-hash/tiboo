/**
 * POST /api/chat
 *
 * Server-side Expo Router API route (Node runtime — keeps OPENAI_API_KEY
 * secure on the server). Calls the autonomous Tiboo agent with structured
 * Zod response schema.
 *
 * Body:  { "message": string }
 * Reply: { "reply": string, "data": TibooResponse }
 */

import { getAIProvider, AIProviderType } from '@/lib/ai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = body?.message;
    const provider = body?.provider as AIProviderType | undefined;
    const userConfirmedAction = Boolean(body?.userConfirmedAction);

    if (typeof message !== 'string' || !message.trim()) {
      return Response.json({ error: 'Le champ message est obligatoire' }, { status: 400 });
    }

    const aiEngine = getAIProvider(provider);
    const agentResponse = await aiEngine.ask({
      message,
      userConfirmedAction,
    });

    return Response.json({
      reply: agentResponse.message,
      data: agentResponse,
      provider: agentResponse.provider,
      model: agentResponse.model,
      requiresConfirmation: agentResponse.requiresConfirmation,
    });
  } catch (error: any) {
    console.error('[api/chat]', error);
    return Response.json(
      {
        error: error?.message || "L'agent n'a pas pu répondre à votre demande",
      },
      { status: 500 }
    );
  }
}
