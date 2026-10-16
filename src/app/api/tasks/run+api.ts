/**
 * POST /api/tasks/run
 *
 * Two callers:
 * - The app (manual "Lancer"): Authorization: Bearer <Supabase token>,
 *   body { taskId }. The task is read with the user's own client, so a user
 *   can only run their own tasks.
 * - The Supabase cron (execute-scheduled-task): header x-tiboo-cron-secret,
 *   body { taskId }. Uses the service client to act for the task's owner.
 */

import { runScheduledTask, ScheduledTaskRow } from '@/lib/agent/recurringTaskRunner';
import { errorResponse, HttpError, isCronRequest, requireUser } from '@/lib/server/auth';
import { enforceRateLimit } from '@/lib/server/rateLimit';
import { createServiceClient } from '@/lib/server/supabaseServer';

const TASK_COLUMNS = 'id, user_id, title, instruction, schedule, timezone';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const taskId = typeof body?.taskId === 'string' ? body.taskId : '';
    if (!taskId) throw new HttpError(400, 'taskId est obligatoire.');

    let db;
    if (isCronRequest(request)) {
      db = createServiceClient();
    } else {
      const auth = await requireUser(request);
      enforceRateLimit(auth.user.id);
      db = auth.db;
    }

    const { data: task, error } = await db
      .from('scheduled_tasks')
      .select(TASK_COLUMNS)
      .eq('id', taskId)
      .single();
    if (error || !task) throw new HttpError(404, 'Tâche introuvable.');
    if (!task.user_id) throw new HttpError(409, "Cette tâche n'a pas de propriétaire.");

    const outcome = await runScheduledTask(task as ScheduledTaskRow, db);
    return Response.json({ success: outcome.status === 'completed', ...outcome });
  } catch (err) {
    return errorResponse(err);
  }
}
