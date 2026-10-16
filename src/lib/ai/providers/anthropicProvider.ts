import Anthropic from '@anthropic-ai/sdk';
import { IAIProvider, AIChatRequest, AIChatResponse } from '../types';
import { buildAgentSystemPrompt } from '@/constants/agentInstructions';

/**
 * Anthropic Claude (official SDK). Conversation only for now: Tiboo's tools
 * are wired to the OpenAI Agents SDK, so Claude cannot use the connectors yet.
 */
export class AnthropicProvider implements IAIProvider {
  readonly id = 'anthropic' as const;
  readonly displayName = 'Anthropic Claude';
  readonly defaultModel = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';
  readonly capabilities = { tools: false };

  private client: Anthropic | null = null;

  isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  }

  async ask(request: AIChatRequest): Promise<AIChatResponse> {
    if (!this.isConfigured()) {
      throw new Error("Claude n'est pas configuré sur le serveur (ANTHROPIC_API_KEY manquant).");
    }
    this.client ??= new Anthropic();

    const messages: Anthropic.Beta.BetaMessageParam[] = [
      ...(request.history || []).slice(-20).map((t) => ({ role: t.role, content: t.content })),
      { role: 'user', content: request.message },
    ];

    const response = await this.client.beta.messages.create({
      model: this.defaultModel,
      max_tokens: 16000,
      system:
        buildAgentSystemPrompt(request.persona) +
        "\n\nDans ce mode, tu n'as accès à aucun outil : ne prétends jamais lire des emails, " +
        "un agenda, Notion ou le web, ni créer une tâche. Dis-le si on te le demande.",
      messages,
      output_config: { effort: 'low' },
      // Server-side fallback if a request is declined by a safety classifier.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });

    if (response.stop_reason === 'refusal') {
      throw new Error('Claude a refusé de répondre à cette demande.');
    }
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (!text) throw new Error("Claude n'a pas renvoyé de réponse.");

    return { message: text, suggestedActions: [], provider: this.id, model: response.model };
  }
}
