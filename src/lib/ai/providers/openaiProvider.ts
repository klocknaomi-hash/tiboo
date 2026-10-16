import { IAIProvider, AIChatRequest, AIChatResponse } from '../types';
import { askAgent } from '../../agent';

export class OpenAIProvider implements IAIProvider {
  readonly id = 'openai' as const;
  readonly displayName = 'OpenAI (GPT-4o)';
  readonly defaultModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  isConfigured(): boolean {
    const key = process.env.OPENAI_API_KEY;
    return typeof key === 'string' && key.trim().length > 0;
  }

  async ask(request: AIChatRequest): Promise<AIChatResponse> {
    const normalized = request.message.toLowerCase();

    // Sensitive action interception: If user requests sending an email or deleting data without prior confirmation
    const isSensitiveEmailSend =
      (normalized.includes('envoie ce mail') ||
        normalized.includes('envoie cet email') ||
        normalized.includes('envoyer l\'email') ||
        normalized.includes('envoyer le mail')) &&
      !request.userConfirmedAction;

    if (isSensitiveEmailSend) {
      return {
        message:
          "⚠️ **Confirmation requise avant envoi**\n\n" +
          "Par mesure de sécurité, l'envoi direct d'emails via le connecteur Gmail requiert votre validation expresse.\n\n" +
          "Voulez-vous autoriser l'envoi de ce message ?",
        summary: "Action sensible : confirmation d'envoi d'email requise.",
        provider: this.id,
        model: this.defaultModel,
        suggestedActions: ["Confirmer l'envoi", "Modifier le contenu", "Annuler"],
        requiresConfirmation: {
          toolName: 'GMAIL_SEND_EMAIL',
          parameters: { prompt: request.message },
          description: "Envoi d'un email via votre compte Gmail connecté",
          warningText: "Cette action est irréversible et enverra le courriel immédiatement.",
        },
      };
    }

    // Call existing autonomous agent (OpenAI SDK + Stagehand + Composio tools + fallback)
    const agentRes = await askAgent(request.message);

    return {
      message: agentRes.message,
      summary: agentRes.summary,
      suggestedActions: agentRes.suggestedActions,
      actionTaken: agentRes.actionTaken,
      provider: this.id,
      model: this.defaultModel,
    };
  }
}
