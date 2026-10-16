/**
 * Tiboo agent runner (OpenAI Agents SDK, server only).
 *
 * - One agent definition, run per request with the caller's context.
 * - Conversation history is passed to the model.
 * - Tools that change external data pause the run (`needsApproval`); the
 *   paused state is signed and returned so the user can confirm or refuse.
 * - No fallback answers: if OpenAI is not configured or fails, the error
 *   is reported as-is.
 */

import { z } from 'zod';
import { Agent, RunContext, RunResult, RunState, assistant, run, setDefaultOpenAIKey, user } from '@openai/agents';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildAgentSystemPrompt } from '@/constants/agentInstructions';
import { ApprovalMeta, createApprovalToken, readApprovalToken } from '../server/approvalToken';
import { TIBOO_TOOLS } from './tools';
import { TibooRunContext } from './context';

export const TibooResponseSchema = z.object({
  message: z.string().describe("La réponse adressée à l'utilisateur, en français."),
  suggestedActions: z
    .array(z.string())
    .describe('1 à 3 prochaines actions suggérées (peut être vide).'),
});
export type TibooResponse = z.infer<typeof TibooResponseSchema>;

export interface AgentPersona {
  name?: string;
  role?: string;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface PendingConfirmation {
  token: string;
  toolName: string;
  description: string;
  arguments: Record<string, unknown>;
}

export interface AgentReply {
  message: string;
  suggestedActions: string[];
  model: string;
  requiresConfirmation?: PendingConfirmation;
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

const TOOL_LABELS: Record<string, string> = {
  gmail: 'Envoyer un email avec ton compte Gmail',
  google_calendar: 'Créer un événement dans ton Google Agenda',
  notion: 'Créer une page dans ton Notion',
  composio_action: 'Modifier des données dans une application connectée',
};

let agent: Agent<TibooRunContext, typeof TibooResponseSchema> | null = null;

function getAgent() {
  if (!isOpenAIConfigured()) {
    throw new Error(
      "L'IA n'est pas encore connectée sur le serveur Tiboo (OPENAI_API_KEY manquant)."
    );
  }
  if (!agent) {
    setDefaultOpenAIKey(process.env.OPENAI_API_KEY!);
    agent = new Agent<TibooRunContext, typeof TibooResponseSchema>({
      name: 'Tiboo',
      model: OPENAI_MODEL,
      instructions: (rc: RunContext<TibooRunContext>) =>
        buildAgentSystemPrompt({
          name: (rc.context as TibooRunContext & AgentPersona).name,
          role: (rc.context as TibooRunContext & AgentPersona).role,
        }),
      outputType: TibooResponseSchema,
      tools: TIBOO_TOOLS,
    });
  }
  return agent;
}

/**
 * Builds the run context. `db` is attached as a non-enumerable property so it
 * is never written into a serialized (signed) run state.
 */
function buildContext(
  userId: string,
  db: SupabaseClient,
  extra: { timezone?: string; persona?: AgentPersona } = {}
): TibooRunContext & AgentPersona {
  const context = {
    userId,
    timezone: extra.timezone,
    name: extra.persona?.name,
    role: extra.persona?.role,
  } as TibooRunContext & AgentPersona;
  Object.defineProperty(context, 'db', { value: db, enumerable: false });
  return context;
}

async function finish(
  result: RunResult<any, any>,
  userId: string,
  meta: ApprovalMeta
): Promise<AgentReply> {
  const interruption = result.interruptions?.[0];
  if (interruption) {
    const raw = interruption.rawItem as { name?: string; arguments?: string };
    const toolName = raw.name || interruption.toolName || 'action';
    let args: Record<string, unknown> = {};
    try {
      args = raw.arguments ? JSON.parse(raw.arguments) : {};
    } catch {
      args = {};
    }
    return {
      message: 'Avant de continuer, j’ai besoin de ta confirmation pour cette action.',
      suggestedActions: [],
      model: OPENAI_MODEL,
      requiresConfirmation: {
        token: createApprovalToken(userId, result.state.toString(), meta),
        toolName,
        description: TOOL_LABELS[toolName] || 'Action sur une application connectée',
        arguments: args,
      },
    };
  }

  const output = result.finalOutput as TibooResponse | undefined;
  if (!output?.message) {
    throw new Error("L'IA n'a pas renvoyé de réponse.");
  }
  return {
    message: output.message,
    suggestedActions: output.suggestedActions || [],
    model: OPENAI_MODEL,
  };
}

/** Runs the agent on a new user message. */
export async function askAgent(params: {
  userId: string;
  db: SupabaseClient;
  message: string;
  history?: ChatTurn[];
  persona?: AgentPersona;
  timezone?: string;
}): Promise<AgentReply> {
  const tibooAgent = getAgent();
  const input = [
    ...(params.history || []).slice(-20).map((t) => (t.role === 'user' ? user(t.content) : assistant(t.content))),
    user(params.message),
  ];
  const context = buildContext(params.userId, params.db, {
    timezone: params.timezone,
    persona: params.persona,
  });
  const result = await run(tibooAgent, input, { context, maxTurns: 8 });
  return finish(result, params.userId, { persona: params.persona, timezone: params.timezone });
}

/** Resumes a paused run after the user approved or refused the action. */
export async function resumeAgent(params: {
  userId: string;
  db: SupabaseClient;
  token: string;
  approve: boolean;
}): Promise<AgentReply> {
  const tibooAgent = getAgent();
  const { state: serialized, meta } = readApprovalToken(params.token, params.userId);
  const context = buildContext(params.userId, params.db, meta);
  const state = await RunState.fromStringWithContext(
    tibooAgent,
    serialized,
    new RunContext(context)
  );

  for (const item of state.getInterruptions()) {
    if (params.approve) state.approve(item);
    else state.reject(item);
  }
  const result = await run(tibooAgent, state, { context, maxTurns: 8 });
  return finish(result, params.userId, meta);
}
