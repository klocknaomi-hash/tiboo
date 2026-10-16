import { IAIProvider, AIChatRequest, AIChatResponse } from '../types';
import { DEFAULT_SYSTEM_INSTRUCTIONS } from '@/constants/agentInstructions';

export class AnthropicProvider implements IAIProvider {
  readonly id = 'anthropic' as const;
  readonly displayName = 'Anthropic Claude (Claude 3.5 Sonnet)';
  readonly defaultModel = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

  isConfigured(): boolean {
    const key = process.env.ANTHROPIC_API_KEY;
    return typeof key === 'string' && key.trim().length > 0;
  }

  async ask(request: AIChatRequest): Promise<AIChatResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return {
        message:
          "ℹ️ **Fournisseur Anthropic Claude sélectionné**\n\n" +
          "La clé d'API `ANTHROPIC_API_KEY` n'est pas encore renseignée dans votre fichier `.env` côté serveur.\n\n" +
          "Claude 3.5 Sonnet est particulièrement adapté pour le raisonnement approfondi et l'orchestration multi-étapes de connecteurs. Dès que la clé sera ajoutée, ce fournisseur sera actif instantanément.",
        summary: "Clé ANTHROPIC_API_KEY manquante.",
        provider: this.id,
        model: this.defaultModel,
        suggestedActions: [
          'Passer sur OpenAI',
          'Consulter la documentation',
          'Vérifier les connecteurs',
        ],
      };
    }

    try {
      const messages = [
        ...(request.history || []).map((m) => ({
          role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: m.content,
        })),
        { role: 'user' as const, content: request.message },
      ];

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.defaultModel,
          max_tokens: 1024,
          system: DEFAULT_SYSTEM_INSTRUCTIONS,
          messages,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const textBlock = data.content?.find((c: any) => c.type === 'text');
      const text = textBlock?.text || 'Réponse reçue.';

      return {
        message: text,
        summary: 'Réponse générée par Claude 3.5 Sonnet',
        provider: this.id,
        model: this.defaultModel,
      };
    } catch (err: any) {
      return {
        message: `Erreur lors de l'appel à Anthropic Claude : ${err?.message || 'Erreur inconnue'}`,
        summary: 'Échec de la requête Anthropic',
        provider: this.id,
        model: this.defaultModel,
      };
    }
  }
}
