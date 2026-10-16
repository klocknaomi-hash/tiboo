/**
 * AI Provider Abstraction (server only)
 *
 * The provider is chosen on the server with DEFAULT_AI_PROVIDER (never by
 * the app), so costs and capabilities stay under the operator's control.
 */

import { AIProviderType, IAIProvider } from './types';
import { OpenAIProvider } from './providers/openaiProvider';
import { AnthropicProvider } from './providers/anthropicProvider';
import { GrokProvider } from './providers/grokProvider';

export * from './types';

const providers: Record<AIProviderType, IAIProvider> = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  grok: new GrokProvider(),
};

export function getAIProvider(): IAIProvider {
  const chosen = process.env.DEFAULT_AI_PROVIDER as AIProviderType | undefined;
  return providers[chosen ?? 'openai'] ?? providers.openai;
}

export function listAvailableProviders() {
  return (Object.keys(providers) as AIProviderType[]).map((key) => {
    const p = providers[key];
    return {
      id: p.id,
      displayName: p.displayName,
      defaultModel: p.defaultModel,
      tools: p.capabilities.tools,
      configured: p.isConfigured(),
    };
  });
}
