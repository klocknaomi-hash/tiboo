/**
 * /api/connectors
 *
 * GET  → { configured, connections: { gmail: bool, googlecalendar: bool, … } }
 *        Real status from Composio for the signed-in user.
 * POST { toolkit } → { redirectUrl } : page where the user connects that account.
 */

import { errorResponse, HttpError, requireUser } from '@/lib/server/auth';
import {
  isComposioConfigured,
  listConnections,
  startConnection,
  SUPPORTED_TOOLKITS,
  SupportedToolkit,
} from '@/lib/server/composio';

export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    if (!isComposioConfigured()) {
      return Response.json({ configured: false, connections: {} });
    }
    return Response.json({ configured: true, connections: await listConnections(user.id) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const toolkit = body?.toolkit as SupportedToolkit;
    if (!SUPPORTED_TOOLKITS.includes(toolkit)) throw new HttpError(400, 'Connecteur inconnu.');
    if (!isComposioConfigured()) {
      throw new HttpError(503, 'Les connecteurs ne sont pas encore activés sur le serveur Tiboo.');
    }
    return Response.json({ redirectUrl: await startConnection(user.id, toolkit) });
  } catch (err) {
    return errorResponse(err);
  }
}
