import { IAIProvider, AIChatRequest, AIChatResponse } from '../types';
import { DEFAULT_SYSTEM_INSTRUCTIONS } from '@/constants/agentInstructions';

export class GrokProvider implements IAIProvider {
  readonly id = 'grok' as const;
  readonly displayName = 'xAI Grok (Grok-2)';
  readonly defaultModel = process.env.GROK_MODEL || 'grok-2-latest';

  isConfigured(): boolean {
    const key = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
    return typeof key === 'string' && key.trim().length > 0;
  }

  async ask(request: AIChatRequest): Promise<AIChatResponse> {
    const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;

    if (!apiKey) {
      return {
        message:
          "ℹ️ **Fournisseur xAI Grok sélectionné**\n\n" +
          "La clé d'API `XAI_API_KEY` (ou `GROK_API_KEY`) n'est pas encore renseignée dans votre fichier `.env` côté serveur.\n\n" +
          "Grok offre une compatibilité directe avec l'API OpenAI et une vitesse d'exécution élevée. Dès que la clé sera ajoutée, ce fournisseur sera actif instantanément.",
        summary: "Clé XAI_API_KEY manquante.",
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
        { role: 'system', content: DEFAULT_SYSTEM_INSTRUCTIONS },
        ...(request.history || []).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user', content: request.message },
      ];

      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || 'Réponse reçue.';

      return {
        message: text,
        summary: 'Réponse générée par xAI Grok',
        provider: this.id,
        model: this.defaultModel,
      };
    } catch (err: any) {
      return {
        message: `Erreur lors de l'appel à xAI Grok : ${err?.message || 'Erreur inconnue'}`,
        summary: 'Échec de la requête xAI',
        provider: this.id,
        model: this.defaultModel,
      };
    }
  }
}
