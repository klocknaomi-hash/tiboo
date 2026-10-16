/**
 * AI Provider Abstraction & Execution Layer
 *
 * Central entry point for dispatching requests to AI models (OpenAI, Claude, Grok),
 * enforcing safety guardrails, user confirmations on sensitive actions, and
 * managing server-side API secret isolation.
 */

import { AIProviderType, IAIProvider } from './types';
import { OpenAIProvider } from './providers/openaiProvider';
import { AnthropicProvider } from './providers/anthropicProvider';
import { GrokProvider } from './providers/grokProvider';

export * from './types';
export { OpenAIProvider } from './providers/openaiProvider';
export { AnthropicProvider } from './providers/anthropicProvider';
export { GrokProvider } from './providers/grokProvider';

// Singleton instances for efficient reuse
const providers: Record<AIProviderType, IAIProvider> = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  grok: new GrokProvider(),
};

/**
 * Returns the requested AI provider instance, falling back to process.env.DEFAULT_AI_PROVIDER
 * or 'openai' (the primary production provider).
 */
export function getAIProvider(providerType?: AIProviderType): IAIProvider {
  const chosenType: AIProviderType =
    providerType ||
    ((process.env.DEFAULT_AI_PROVIDER as AIProviderType) || 'openai');

  const provider = providers[chosenType];
  if (!provider) {
    return providers.openai;
  }
  return provider;
}

/**
 * Returns metadata and readiness status for all supported providers
 */
export function listAvailableProviders() {
  return (Object.keys(providers) as AIProviderType[]).map((key) => {
    const p = providers[key];
    return {
      id: p.id,
      displayName: p.displayName,
      defaultModel: p.defaultModel,
      configured: p.isConfigured(),
    };
  });
}

/**
 * Sensitive tool catalog: actions that mutate real-world external services
 * or execute financial / irreversible actions must be flagged for explicit user confirmation.
 */
export const SENSITIVE_TOOLS = [
  'GMAIL_SEND_EMAIL',
  'SLACK_CHAT_POST_MESSAGE',
  'GITHUB_CREATE_PULL_REQUEST',
  'GITHUB_DELETE_REPO',
  'NOTION_DELETE_BLOCK',
  'BROWSER_SUBMIT_PAYMENT',
  'BROWSER_DELETE_ACCOUNT',
] as const;

export function isSensitiveTool(toolName: string): boolean {
  return (SENSITIVE_TOOLS as readonly string[]).includes(toolName.toUpperCase());
}
