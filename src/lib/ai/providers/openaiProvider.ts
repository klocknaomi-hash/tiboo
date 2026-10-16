import { IAIProvider, AIChatRequest, AIChatResponse } from '../types';
import { askAgent, isOpenAIConfigured, OPENAI_MODEL } from '../../agent';

/**
 * OpenAI via the Agents SDK: the only provider wired to Tiboo's tools
 * (connectors, scheduled tasks, web reading, confirmations).
 */
export class OpenAIProvider implements IAIProvider {
  readonly id = 'openai' as const;
  readonly displayName = 'OpenAI (Agents SDK)';
  readonly defaultModel = OPENAI_MODEL;
  readonly capabilities = { tools: true };

  isConfigured(): boolean {
    return isOpenAIConfigured();
  }

  async ask(request: AIChatRequest): Promise<AIChatResponse> {
    const reply = await askAgent(request);
    return { ...reply, provider: this.id };
  }
}
