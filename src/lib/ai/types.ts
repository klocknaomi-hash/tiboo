/**
 * AI Provider Abstraction Layer - Type Definitions
 *
 * Provides a unified contract for AI engines (OpenAI, Anthropic Claude, xAI Grok)
 * allowing seamless provider switching without touching the UI or routing.
 */

export type AIProviderType = 'openai' | 'anthropic' | 'grok';

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIChatRequest {
  message: string;
  history?: AIChatMessage[];
  /** Optional agent persona context (Léo, Chloé, Amir, Kaya) */
  agentName?: string;
  agentRole?: string;
  /** Explicit user confirmation for sensitive operations (e.g. sending emails) */
  userConfirmedAction?: boolean;
}

export interface SensitiveActionRequest {
  toolName: string;
  parameters: Record<string, any>;
  description: string;
  warningText: string;
}

export interface AIChatResponse {
  /** The primary conversational message rendered in the chat */
  message: string;
  /** High-level summary of the action/result */
  summary?: string;
  /** 1-3 suggested quick action chips for the user */
  suggestedActions?: string[];
  /** Description of the tool executed (e.g. Composio Gmail, Stagehand Browser) */
  actionTaken?: string;
  /** Triggered when an irreversible action requires explicit user approval */
  requiresConfirmation?: SensitiveActionRequest;
  /** Name of the active provider that generated the response */
  provider: AIProviderType;
  /** Name of the model used */
  model: string;
}

export interface IAIProvider {
  readonly id: AIProviderType;
  readonly displayName: string;
  readonly defaultModel: string;
  isConfigured(): boolean;
  ask(request: AIChatRequest): Promise<AIChatResponse>;
}
