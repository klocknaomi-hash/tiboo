/**
 * Supabase Edge Function: execute-scheduled-task
 *
 * Called by pg_cron (public.trigger_due_scheduled_tasks) with the service
 * role key. It does not run any AI itself: it forwards the task to the Tiboo
 * server (POST {TIBOO_API_URL}/api/tasks/run), which runs the real agent
 * with the user's own connectors and records the outcome.
 *
 * Required secrets (supabase secrets set …):
 *   TIBOO_API_URL       e.g. https://tiboo.expo.app
 *   TIBOO_CRON_SECRET   same value as on the Tiboo server
 * If they are missing, the run is recorded as failed with the reason:
 * nothing is ever reported as done when it was not.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

serve(async (req: Request) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const auth = req.headers.get('authorization') || '';

  // Only pg_cron (holding the service role key) may trigger runs.
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return json({ error: 'Non autorisé' }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const taskId = typeof body?.taskId === 'string' ? body.taskId : '';
  if (!taskId) return json({ error: 'taskId manquant' }, 400);

  const apiUrl = (Deno.env.get('TIBOO_API_URL') || '').replace(/\/$/, '');
  const cronSecret = Deno.env.get('TIBOO_CRON_SECRET') || '';

  if (!apiUrl || !cronSecret) {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') || '', serviceKey);
    const now = new Date().toISOString();
    await supabase.from('task_executions').insert({
      task_id: taskId,
      status: 'failed',
      started_at: now,
      completed_at: now,
      error: 'Serveur Tiboo non configuré (TIBOO_API_URL / TIBOO_CRON_SECRET) : tâche non exécutée.',
    });
    return json({ success: false, error: 'Serveur Tiboo non configuré' }, 503);
  }

  try {
    const res = await fetch(`${apiUrl}/api/tasks/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tiboo-cron-secret': cronSecret },
      body: JSON.stringify({ taskId }),
    });
    const result = await res.json().catch(() => ({}));
    return json(result, res.status);
  } catch (err) {
    console.error('[execute-scheduled-task]', err);
    return json({ success: false, error: 'Serveur Tiboo injoignable' }, 502);
  }
});
