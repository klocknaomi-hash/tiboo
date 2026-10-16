import { IAIProvider, AIChatRequest, AIChatResponse } from '../types';
import { buildAgentSystemPrompt } from '@/constants/agentInstructions';

/**
 * xAI Grok (OpenAI-compatible Chat Completions API). Conversation only:
 * no access to Tiboo's tools. Set GROK_MODEL to a model id listed in your
 * xAI console (the default below must be checked there).
 */
export class GrokProvider implements IAIProvider {
  readonly id = 'grok' as const;
  readonly displayName = 'xAI Grok';
  readonly defaultModel = process.env.GROK_MODEL || 'grok-4.5';
  readonly capabilities = { tools: false };

  private apiKey(): string | undefined {
    return (process.env.XAI_API_KEY || process.env.GROK_API_KEY)?.trim();
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey());
  }

  async ask(request: AIChatRequest): Promise<AIChatResponse> {
    const key = this.apiKey();
    if (!key) throw new Error("Grok n'est pas configuré sur le serveur (XAI_API_KEY manquant).");

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content:
              buildAgentSystemPrompt(request.persona) +
              "\n\nDans ce mode, tu n'as accès à aucun outil : ne prétends jamais lire des emails, " +
              'un agenda, Notion ou le web, ni créer une tâche.',
          },
          ...(request.history || []).slice(-20),
          { role: 'user', content: request.message },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `Grok a répondu ${res.status}.`);

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Grok n'a pas renvoyé de réponse.");
    return { message: text, suggestedActions: [], provider: this.id, model: data.model || this.defaultModel };
  }
}
