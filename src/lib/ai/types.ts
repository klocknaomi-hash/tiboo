/**
 * AI Provider Abstraction Layer - Type Definitions
 *
 * One contract for every AI engine (OpenAI, Anthropic Claude, xAI Grok), so
 * the provider can be switched with DEFAULT_AI_PROVIDER without touching the
 * UI or the routes. `capabilities.tools` says honestly whether the provider
 * can use the connectors (Gmail, Agenda, Notion, tâches, web).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChatTurn, AgentPersona, PendingConfirmation } from '../agent';

export type AIProviderType = 'openai' | 'anthropic' | 'grok';

export interface AIChatRequest {
  userId: string;
  db: SupabaseClient;
  message: string;
  history?: ChatTurn[];
  persona?: AgentPersona;
  timezone?: string;
}

export interface AIChatResponse {
  message: string;
  suggestedActions: string[];
  provider: AIProviderType;
  model: string;
  /** Present when a sensitive action waits for the user's approval. */
  requiresConfirmation?: PendingConfirmation;
}

export interface IAIProvider {
  readonly id: AIProviderType;
  readonly displayName: string;
  readonly defaultModel: string;
  readonly capabilities: { tools: boolean };
  isConfigured(): boolean;
  ask(request: AIChatRequest): Promise<AIChatResponse>;
}
