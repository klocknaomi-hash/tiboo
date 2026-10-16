/**
 * Composio connectors (server only), scoped to ONE Tiboo user.
 *
 * Each Supabase user id is used as the Composio user id, so every user
 * connects and uses their own Gmail / Calendar / Notion accounts.
 * Nothing is simulated: if Composio is not configured, the account is not
 * connected or the call fails, the error is returned as-is to the agent.
 */

import { Composio } from '@composio/core';

let client: Composio | null = null;

export function isComposioConfigured(): boolean {
  return Boolean(process.env.COMPOSIO_API_KEY?.trim());
}

function getComposio(): Composio {
  if (!isComposioConfigured()) {
    throw new Error(
      "Les connecteurs ne sont pas encore activés sur le serveur Tiboo (COMPOSIO_API_KEY manquant)."
    );
  }
  if (!client) {
    // Optional pinned toolkit versions, e.g. {"gmail":"20250909_00"}
    let toolkitVersions: Record<string, string> | undefined;
    try {
      toolkitVersions = process.env.COMPOSIO_TOOLKIT_VERSIONS
        ? JSON.parse(process.env.COMPOSIO_TOOLKIT_VERSIONS)
        : undefined;
    } catch {
      toolkitVersions = undefined;
    }
    client = new Composio({ apiKey: process.env.COMPOSIO_API_KEY, toolkitVersions });
  }
  return client;
}

/** Toolkits the app offers in the Connectors screen. */
export const SUPPORTED_TOOLKITS = ['gmail', 'googlecalendar', 'notion', 'slack', 'github'] as const;
export type SupportedToolkit = (typeof SUPPORTED_TOOLKITS)[number];

export interface ToolCallOutcome {
  ok: boolean;
  data?: unknown;
  error?: string;
}

/** Runs one Composio tool for this user and reports exactly what happened. */
export async function executeTool(
  userId: string,
  slug: string,
  args: Record<string, unknown>
): Promise<ToolCallOutcome> {
  try {
    const res = await getComposio().tools.execute(slug, {
      userId,
      arguments: args,
      // Without pinned versions (COMPOSIO_TOOLKIT_VERSIONS), use the latest tool version.
      dangerouslySkipVersionCheck: !process.env.COMPOSIO_TOOLKIT_VERSIONS,
    });
    if (!res.successful) {
      return { ok: false, error: res.error || `L'outil ${slug} a échoué.` };
    }
    return { ok: true, data: res.data };
  } catch (err: any) {
    return { ok: false, error: err?.message || `L'outil ${slug} a échoué.` };
  }
}

/** Real connection status of each supported toolkit for this user. */
export async function listConnections(
  userId: string
): Promise<Record<SupportedToolkit, boolean>> {
  const status = Object.fromEntries(SUPPORTED_TOOLKITS.map((t) => [t, false])) as Record<
    SupportedToolkit,
    boolean
  >;
  const res = await getComposio().connectedAccounts.list({
    userIds: [userId],
    statuses: ['ACTIVE'],
  });
  for (const account of res.items) {
    const slug = account.toolkit?.slug as SupportedToolkit;
    if (slug in status) status[slug] = true;
  }
  return status;
}

/** Starts the OAuth flow for a toolkit; returns the page the user must open. */
export async function startConnection(userId: string, toolkit: SupportedToolkit): Promise<string> {
  const request = await getComposio().toolkits.authorize(userId, toolkit);
  if (!request.redirectUrl) {
    throw new Error("Composio n'a pas renvoyé de lien de connexion.");
  }
  return request.redirectUrl;
}
