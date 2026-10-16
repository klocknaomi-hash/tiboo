/**
 * Composio Tools for OpenAI Agents SDK
 *
 * Exposes external apps (Gmail, Google Calendar, Notion, Slack, GitHub, etc.)
 * through the unified Model Context Protocol (MCP) server.
 *
 * Each tool validates inputs using Zod schemas, delegates execution to
 * the Composio MCP client, and formats the result for the agent to
 * generate a clean, elegant, human-readable answer.
 */

import { z } from 'zod';
import { tool } from '@openai/agents';
import { defaultComposioMcpClient } from './mcpClient';

// ------------------------------------------------------------------------------
// 1. Gmail Tool (Composio MCP)
// ------------------------------------------------------------------------------

export const composioGmailParameters = z.object({
  action: z
    .enum(['list_unread', 'search', 'send'])
    .default('list_unread')
    .describe("Action à réaliser sur Gmail : 'list_unread' pour les non lus, 'search' pour chercher, 'send' pour envoyer."),
  maxResults: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe('Nombre maximum d’emails à récupérer (par défaut 5)'),
  query: z
    .string()
    .optional()
    .describe("Critère de recherche optionnel (ex: 'from:alexandre', 'facture', 'is:unread')"),
  to: z
    .string()
    .optional()
    .describe("Adresse destinataire si action='send'"),
  subject: z
    .string()
    .optional()
    .describe("Objet de l'email si action='send'"),
  body: z
    .string()
    .optional()
    .describe("Corps du message si action='send'"),
});

export type ComposioGmailParameters = z.infer<typeof composioGmailParameters>;

export async function executeComposioGmail({
  action,
  maxResults,
  query,
  to,
  subject,
  body,
}: ComposioGmailParameters): Promise<string> {
  try {
    if (action === 'send') {
      const result = await defaultComposioMcpClient.callTool('GMAIL_SEND_EMAIL', {
        recipient_email: to,
        subject,
        body,
      });
      return JSON.stringify({
        status: 'success',
        action: 'send_email',
        message: `Email envoyé avec succès à ${to} avec l'objet "${subject}".`,
        details: result.content[0]?.text,
      });
    }

    const result = await defaultComposioMcpClient.callTool('GMAIL_FETCH_EMAILS', {
      max_results: maxResults,
      is_unread: action === 'list_unread',
      query: query || (action === 'list_unread' ? 'is:unread' : undefined),
    });

    return JSON.stringify({
      status: 'success',
      action,
      count: maxResults,
      data: result.content[0]?.data || JSON.parse(result.content[0]?.text || '{}'),
    });
  } catch (err: any) {
    return JSON.stringify({
      status: 'error',
      message: `Erreur lors de l'accès à Gmail via Composio MCP: ${err?.message || 'Erreur inconnue'}`,
    });
  }
}

export const composioGmailTool = tool({
  name: 'composio_gmail',
  description:
    'Consulte et interagit avec Gmail via le serveur Composio MCP. ' +
    'Utilisé pour lister les derniers emails non lus, chercher des messages spécifiques ou envoyer des emails. ' +
    'Toujours synthétiser les emails avec expéditeur, objet et date.',
  parameters: composioGmailParameters,
  execute: executeComposioGmail,
});

// ------------------------------------------------------------------------------
// 2. Google Calendar Tool (Composio MCP)
// ------------------------------------------------------------------------------

export const composioCalendarParameters = z.object({
  action: z
    .enum(['list_upcoming', 'create_event', 'check_availability'])
    .default('list_upcoming')
    .describe("Action sur l'agenda : 'list_upcoming' pour les prochains rendez-vous, 'create_event' pour ajouter un événement."),
  maxResults: z
    .number()
    .min(1)
    .max(20)
    .default(3)
    .describe("Nombre d'événements à récupérer (par défaut 3)"),
  timeMin: z
    .string()
    .optional()
    .describe('Date / Heure de départ minimale au format ISO (ex: aujourd’hui)'),
  summary: z
    .string()
    .optional()
    .describe("Titre de l'événement si action='create_event'"),
  startTime: z
    .string()
    .optional()
    .describe("Heure de début au format ISO si action='create_event'"),
  endTime: z
    .string()
    .optional()
    .describe("Heure de fin au format ISO si action='create_event'"),
});

export type ComposioCalendarParameters = z.infer<typeof composioCalendarParameters>;

export async function executeComposioCalendar({
  action,
  maxResults,
  timeMin,
  summary,
  startTime,
  endTime,
}: ComposioCalendarParameters): Promise<string> {
  try {
    if (action === 'create_event') {
      const result = await defaultComposioMcpClient.callTool('GOOGLECALENDAR_CREATE_EVENT', {
        summary: summary || 'Nouvel événement',
        start_time: startTime || new Date().toISOString(),
        end_time: endTime || new Date(Date.now() + 3600000).toISOString(),
      });
      return JSON.stringify({
        status: 'success',
        action: 'create_event',
        message: `Événement "${summary}" planifié avec succès dans Google Calendar.`,
        details: result.content[0]?.text,
      });
    }

    const result = await defaultComposioMcpClient.callTool('GOOGLECALENDAR_FIND_EVENTS', {
      max_results: maxResults,
      time_min: timeMin || new Date().toISOString(),
    });

    return JSON.stringify({
      status: 'success',
      action,
      count: maxResults,
      data: result.content[0]?.data || JSON.parse(result.content[0]?.text || '{}'),
    });
  } catch (err: any) {
    return JSON.stringify({
      status: 'error',
      message: `Erreur lors de l'accès à Google Calendar via Composio MCP: ${err?.message || 'Erreur inconnue'}`,
    });
  }
}

export const composioCalendarTool = tool({
  name: 'composio_google_calendar',
  description:
    'Consulte et gère les événements de Google Calendar via le serveur Composio MCP. ' +
    'Permet de voir les prochains événements ou de planifier un rendez-vous. ' +
    'Toujours restituer les résultats avec date, plage horaire et participants.',
  parameters: composioCalendarParameters,
  execute: executeComposioCalendar,
});

// ------------------------------------------------------------------------------
// 3. Notion Tool (Composio MCP)
// ------------------------------------------------------------------------------

export const composioNotionParameters = z.object({
  action: z
    .enum(['search', 'create_page', 'get_page'])
    .default('search')
    .describe("Action sur Notion : 'search' pour rechercher dans les docs et bases de données, 'create_page' pour ajouter une note."),
  query: z
    .string()
    .default('projet')
    .describe("Mots-clés de recherche dans Notion (ex: 'Roadmap', 'Docs projet', 'Sprint')"),
  title: z
    .string()
    .optional()
    .describe("Titre de la nouvelle page si action='create_page'"),
  content: z
    .string()
    .optional()
    .describe("Contenu textuel de la page si action='create_page'"),
});

export type ComposioNotionParameters = z.infer<typeof composioNotionParameters>;

export async function executeComposioNotion({
  action,
  query,
  title,
  content,
}: ComposioNotionParameters): Promise<string> {
  try {
    if (action === 'create_page') {
      const result = await defaultComposioMcpClient.callTool('NOTION_CREATE_PAGE', {
        title: title || 'Nouvelle note',
        content: content || '',
      });
      return JSON.stringify({
        status: 'success',
        action: 'create_page',
        message: `Page Notion "${title}" créée avec succès.`,
        details: result.content[0]?.text,
      });
    }

    const result = await defaultComposioMcpClient.callTool('NOTION_SEARCH_NOTION_PAGE', {
      query,
    });

    return JSON.stringify({
      status: 'success',
      action,
      query,
      data: result.content[0]?.data || JSON.parse(result.content[0]?.text || '{}'),
    });
  } catch (err: any) {
    return JSON.stringify({
      status: 'error',
      message: `Erreur lors de l'accès à Notion via Composio MCP: ${err?.message || 'Erreur inconnue'}`,
    });
  }
}

export const composioNotionTool = tool({
  name: 'composio_notion',
  description:
    'Recherche et organise les documents, roadmaps et notes dans Notion via Composio MCP. ' +
    'À utiliser dès que l’utilisateur cherche ses documents projet, notes de réunion ou bases Notion.',
  parameters: composioNotionParameters,
  execute: executeComposioNotion,
});

// ------------------------------------------------------------------------------
// 4. Generic Composio MCP Execution Tool (100+ tools gateway)
// ------------------------------------------------------------------------------

export const composioGenericMcpParameters = z.object({
  app: z
    .string()
    .describe("Nom de l'application Composio (ex: 'slack', 'github', 'reddit', 'googledocs', 'linear')"),
  action: z
    .string()
    .describe("Action MCP ou nom de tool Composio (ex: 'SLACK_SEND_MESSAGE', 'GITHUB_CREATE_ISSUE')"),
  parameters: z
    .record(z.string(), z.any())
    .optional()
    .describe("Paramètres de l'action à exécuter"),
});

export type ComposioGenericMcpParameters = z.infer<typeof composioGenericMcpParameters>;

export async function executeComposioGenericMcp({
  app,
  action,
  parameters,
}: ComposioGenericMcpParameters): Promise<string> {
  try {
    const result = await defaultComposioMcpClient.callTool(action, parameters || {});
    return JSON.stringify({
      status: 'success',
      app,
      action,
      result: result.content[0]?.data || result.content[0]?.text,
    });
  } catch (err: any) {
    return JSON.stringify({
      status: 'error',
      app,
      action,
      message: `Erreur d'exécution MCP Composio: ${err?.message || 'Erreur inconnue'}`,
    });
  }
}

export const composioGenericMcpTool = tool({
  name: 'composio_mcp_execute',
  description:
    'Passerelle universelle Model Context Protocol (MCP) pour exécuter une action parmi les 100+ applications ' +
    'connectées Composio (Slack, GitHub, Reddit, Google Docs, Linear, etc.).',
  parameters: composioGenericMcpParameters,
  execute: executeComposioGenericMcp,
});

// ------------------------------------------------------------------------------
// 5. Composio Tools Suite Export
// ------------------------------------------------------------------------------

export const composioTools = [
  composioGmailTool,
  composioCalendarTool,
  composioNotionTool,
  composioGenericMcpTool,
];
