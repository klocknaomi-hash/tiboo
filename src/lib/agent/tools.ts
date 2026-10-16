/**
 * Tiboo agent tools (server only).
 *
 * Rules shared by every tool:
 * - It acts for the current user only (TibooRunContext), never a global account.
 * - It returns what really happened. On failure it returns the error, and the
 *   agent must tell the user the action did not happen. Nothing is simulated.
 * - Anything that writes to an external service (send, create, delete…) is
 *   paused with `needsApproval` until the user confirms it in the app.
 */

import { z } from 'zod';
import { tool, RunContext } from '@openai/agents';
import { executeTool } from '../server/composio';
import { isValidCron, getNextCronRunDate, formatCronToHuman } from '../cronUtils';
import { TibooRunContext } from './context';

function ctx(runContext?: RunContext<TibooRunContext>): TibooRunContext {
  if (!runContext?.context?.userId) {
    throw new Error('Contexte utilisateur manquant : action refusée.');
  }
  return runContext.context;
}

async function runConnector(
  runContext: RunContext<TibooRunContext> | undefined,
  slug: string,
  args: Record<string, unknown>
): Promise<string> {
  const { userId } = ctx(runContext);
  const outcome = await executeTool(userId, slug, args);
  return JSON.stringify(
    outcome.ok
      ? { status: 'success', tool: slug, data: outcome.data }
      : {
          status: 'error',
          tool: slug,
          error: outcome.error,
          note: "L'action n'a PAS été effectuée. Dis-le clairement à l'utilisateur.",
        }
  );
}

/** Drops null values so optional arguments are not sent to Composio. */
function compact(args: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(args).filter(([, v]) => v !== null && v !== undefined));
}

// ------------------------------------------------------------------------------
// Gmail
// ------------------------------------------------------------------------------
const gmailParameters = z.object({
  action: z.enum(['list_unread', 'search', 'send']).describe(
    "'list_unread' : derniers non lus · 'search' : recherche · 'send' : envoyer un email (confirmation obligatoire)"
  ),
  maxResults: z.number().int().min(1).max(20).nullable().describe('Nombre d’emails (5 par défaut)'),
  query: z.string().nullable().describe("Recherche Gmail (ex: 'from:alexandre', 'facture')"),
  to: z.string().nullable().describe("Destinataire si action='send'"),
  subject: z.string().nullable().describe("Objet si action='send'"),
  body: z.string().nullable().describe("Corps du message si action='send'"),
});

export const gmailTool = tool({
  name: 'gmail',
  description: 'Lit, recherche ou envoie des emails avec le compte Gmail connecté de l’utilisateur.',
  parameters: gmailParameters,
  needsApproval: async (_rc, input) => input.action === 'send',
  execute: async (input, runContext?: RunContext<TibooRunContext>) => {
    if (input.action === 'send') {
      if (!input.to || !input.subject || !input.body) {
        return JSON.stringify({ status: 'error', error: 'Destinataire, objet et message sont obligatoires.' });
      }
      return runConnector(runContext, 'GMAIL_SEND_EMAIL', {
        recipient_email: input.to,
        subject: input.subject,
        body: input.body,
      });
    }
    return runConnector(
      runContext,
      'GMAIL_FETCH_EMAILS',
      compact({
        max_results: input.maxResults ?? 5,
        query: input.query ?? (input.action === 'list_unread' ? 'is:unread' : null),
      })
    );
  },
});

// ------------------------------------------------------------------------------
// Google Calendar
// ------------------------------------------------------------------------------
const calendarParameters = z.object({
  action: z.enum(['list_upcoming', 'create_event']).describe(
    "'list_upcoming' : prochains événements · 'create_event' : ajouter un événement (confirmation obligatoire)"
  ),
  maxResults: z.number().int().min(1).max(20).nullable().describe('Nombre d’événements (5 par défaut)'),
  summary: z.string().nullable().describe("Titre si action='create_event'"),
  startTime: z.string().nullable().describe("Début ISO 8601 si action='create_event'"),
  endTime: z.string().nullable().describe("Fin ISO 8601 si action='create_event'"),
});

export const calendarTool = tool({
  name: 'google_calendar',
  description: 'Consulte ou crée des événements dans le Google Agenda connecté de l’utilisateur.',
  parameters: calendarParameters,
  needsApproval: async (_rc, input) => input.action === 'create_event',
  execute: async (input, runContext?: RunContext<TibooRunContext>) => {
    if (input.action === 'create_event') {
      if (!input.summary || !input.startTime || !input.endTime) {
        return JSON.stringify({ status: 'error', error: 'Titre, début et fin sont obligatoires.' });
      }
      return runConnector(runContext, 'GOOGLECALENDAR_CREATE_EVENT', {
        summary: input.summary,
        start_datetime: input.startTime,
        end_datetime: input.endTime,
      });
    }
    return runConnector(runContext, 'GOOGLECALENDAR_FIND_EVENT', {
      max_results: input.maxResults ?? 5,
      timeMin: new Date().toISOString(),
    });
  },
});

// ------------------------------------------------------------------------------
// Notion
// ------------------------------------------------------------------------------
const notionParameters = z.object({
  action: z.enum(['search', 'create_page']).describe(
    "'search' : chercher dans Notion · 'create_page' : créer une page (confirmation obligatoire)"
  ),
  query: z.string().nullable().describe('Mots-clés de recherche'),
  parentPageId: z.string().nullable().describe("Page parente si action='create_page'"),
  title: z.string().nullable().describe("Titre si action='create_page'"),
});

export const notionTool = tool({
  name: 'notion',
  description: 'Recherche ou crée des pages dans le Notion connecté de l’utilisateur.',
  parameters: notionParameters,
  needsApproval: async (_rc, input) => input.action === 'create_page',
  execute: async (input, runContext?: RunContext<TibooRunContext>) => {
    if (input.action === 'create_page') {
      if (!input.title || !input.parentPageId) {
        return JSON.stringify({ status: 'error', error: 'Titre et page parente sont obligatoires.' });
      }
      return runConnector(runContext, 'NOTION_CREATE_NOTION_PAGE', {
        parent_id: input.parentPageId,
        title: input.title,
      });
    }
    return runConnector(runContext, 'NOTION_SEARCH_NOTION_PAGE', compact({ query: input.query }));
  },
});

// ------------------------------------------------------------------------------
// Any other Composio action (Slack, GitHub, …)
// ------------------------------------------------------------------------------
const WRITE_ACTION =
  /(SEND|CREATE|DELETE|REMOVE|UPDATE|EDIT|POST|REPLY|FORWARD|INVITE|ARCHIVE|MOVE|INSERT|PATCH|PUT|MERGE|CLOSE|ADD|SET|UPLOAD|SHARE|PAY|TRANSFER|PUBLISH)/;

const genericParameters = z.object({
  action: z.string().describe("Slug exact de l'action Composio (ex: 'SLACK_LIST_CHANNELS', 'GITHUB_CREATE_AN_ISSUE')"),
  argumentsJson: z.string().describe('Arguments de l’action, en JSON (ex: {"owner":"tiboo"}). "{}" si aucun.'),
});

export const composioActionTool = tool({
  name: 'composio_action',
  description:
    'Exécute une autre action d’une application connectée via Composio (Slack, GitHub…). ' +
    'Les actions qui modifient des données demandent une confirmation.',
  parameters: genericParameters,
  needsApproval: async (_rc, input) => WRITE_ACTION.test(input.action.toUpperCase()),
  execute: async (input, runContext?: RunContext<TibooRunContext>) => {
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(input.argumentsJson || '{}');
    } catch {
      return JSON.stringify({ status: 'error', error: 'Arguments JSON invalides.' });
    }
    return runConnector(runContext, input.action.toUpperCase(), args);
  },
});

// ------------------------------------------------------------------------------
// Scheduled tasks (saved in Supabase for the current user)
// ------------------------------------------------------------------------------
const scheduleParameters = z.object({
  instruction: z.string().describe("Instruction exacte que l'agent exécutera à chaque fois"),
  schedule: z.string().describe("Expression cron à 5 champs (ex: '0 9 * * *' = tous les jours à 9h)"),
  title: z.string().nullable().describe('Titre court de la tâche'),
});

export const scheduleTaskTool = tool({
  name: 'schedule_recurring_task',
  description:
    "Enregistre une tâche récurrente pour l'utilisateur (sans l'exécuter maintenant). " +
    "Ne dis qu'elle est enregistrée que si ce tool renvoie status 'success'.",
  parameters: scheduleParameters,
  execute: async (input, runContext?: RunContext<TibooRunContext>) => {
    const { userId, db, timezone } = ctx(runContext);
    const schedule = input.schedule.trim();
    if (!isValidCron(schedule)) {
      return JSON.stringify({ status: 'error', error: `Fréquence invalide : "${schedule}".` });
    }
    const tz = timezone || 'Europe/Paris';
    const { data, error } = await db
      .from('scheduled_tasks')
      .insert({
        user_id: userId,
        title: input.title || input.instruction.slice(0, 60),
        instruction: input.instruction.trim(),
        schedule,
        timezone: tz,
        is_active: true,
        next_run_at: getNextCronRunDate(schedule, new Date(), tz).toISOString(),
        status: 'active',
      })
      .select('id, title, schedule, next_run_at')
      .single();

    if (error || !data) {
      return JSON.stringify({
        status: 'error',
        error: error?.message || "La tâche n'a pas pu être enregistrée.",
        note: "La tâche n'a PAS été créée. Dis-le clairement à l'utilisateur.",
      });
    }
    return JSON.stringify({
      status: 'success',
      task: { ...data, frequency: formatCronToHuman(schedule) },
    });
  },
});

// ------------------------------------------------------------------------------
// Web reading (Browserbase + Stagehand if configured, otherwise a plain fetch)
// ------------------------------------------------------------------------------
const PRIVATE_HOST =
  /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|.*\.internal$|.*\.local$)/i;

function assertPublicUrl(raw: string): URL {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || PRIVATE_HOST.test(url.hostname)) {
    throw new Error('Seules les pages web publiques (http/https) sont autorisées.');
  }
  return url;
}

const browseParameters = z.object({
  url: z.string().describe('URL complète de la page publique à lire'),
  instruction: z.string().describe('Ce qu’il faut chercher ou extraire sur la page'),
});

export const browseWebTool = tool({
  name: 'browse_web',
  description:
    'Lit une page web publique et en extrait le contenu demandé. ' +
    "Ne remplit aucun formulaire et n'effectue aucun achat.",
  parameters: browseParameters,
  execute: async ({ url, instruction }) => {
    let target: URL;
    try {
      target = assertPublicUrl(url);
    } catch (err: any) {
      return JSON.stringify({ status: 'error', error: err.message });
    }

    if (process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID) {
      try {
        const { Stagehand, browserbase } = await import('@browserbasehq/stagehand');
        const browser = await browserbase.launch({
          apiKey: process.env.BROWSERBASE_API_KEY,
          projectId: process.env.BROWSERBASE_PROJECT_ID,
        });
        const stagehand = await Stagehand.create({
          browser,
          model: {
            apiKey: process.env.OPENAI_API_KEY,
            modelName: process.env.STAGEHAND_MODEL || 'openai/gpt-4o-mini',
          },
        } as any);
        try {
          await stagehand.act(`go to ${target.href}`);
          const extracted = await stagehand.extract(instruction);
          return JSON.stringify({ status: 'success', source: target.href, method: 'navigateur', data: extracted });
        } finally {
          await stagehand.close().catch(() => {});
          await (browser as any).close?.().catch?.(() => {});
        }
      } catch (err: any) {
        console.warn('[browse_web] Stagehand indisponible, lecture simple :', err?.message);
      }
    }

    try {
      const response = await fetch(target.href, {
        headers: { 'User-Agent': 'Mozilla/5.0 TibooAgent/1.0' },
        redirect: 'follow',
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        return JSON.stringify({ status: 'error', error: `La page a répondu ${response.status}.` });
      }
      const html = await response.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 6000);
      return JSON.stringify({
        status: 'success',
        source: target.href,
        method: 'lecture simple (texte brut de la page)',
        instruction,
        text,
      });
    } catch (err: any) {
      return JSON.stringify({ status: 'error', error: `Page inaccessible : ${err?.message || 'erreur réseau'}` });
    }
  },
});

export const TIBOO_TOOLS = [
  gmailTool,
  calendarTool,
  notionTool,
  composioActionTool,
  scheduleTaskTool,
  browseWebTool,
];
