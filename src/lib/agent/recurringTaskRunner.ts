/**
 * Scheduled task runner (server only).
 *
 * Runs one task from `scheduled_tasks` with the real agent and records the
 * outcome in `task_executions`. The run is reported as failed whenever the
 * agent errors, and also when it needs a confirmation (nobody is there to
 * give it during a scheduled run), so a "completed" run always really ran.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getNextCronRunDate } from '../cronUtils';
import { askAgent } from './index';

export interface ScheduledTaskRow {
  id: string;
  user_id: string;
  title: string | null;
  instruction: string;
  schedule: string;
  timezone: string | null;
}

export interface TaskRunOutcome {
  executionId: string | null;
  status: 'completed' | 'failed';
  message: string;
}

export async function runScheduledTask(task: ScheduledTaskRow, db: SupabaseClient): Promise<TaskRunOutcome> {
  const startedAt = new Date().toISOString();
  const timezone = task.timezone || 'Europe/Paris';

  // Claim the run first so a second trigger does not run it twice.
  await db
    .from('scheduled_tasks')
    .update({
      last_run_at: startedAt,
      next_run_at: getNextCronRunDate(task.schedule, new Date(), timezone).toISOString(),
      updated_at: startedAt,
    })
    .eq('id', task.id);

  const { data: execution } = await db
    .from('task_executions')
    .insert({ task_id: task.id, status: 'running', started_at: startedAt })
    .select('id')
    .single();
  const executionId = execution?.id ?? null;

  let status: TaskRunOutcome['status'] = 'completed';
  let message = '';
  let errorText: string | null = null;

  try {
    const reply = await askAgent({
      userId: task.user_id,
      db,
      timezone,
      message:
        `Tâche planifiée « ${task.title || task.instruction} ». Exécute maintenant : ${task.instruction}\n` +
        'Rends compte uniquement de ce que tes outils ont réellement fait.',
    });
    if (reply.requiresConfirmation) {
      status = 'failed';
      errorText = `Non exécutée : « ${reply.requiresConfirmation.description} » demande ta confirmation. Lance-la depuis le chat.`;
      message = errorText;
    } else {
      message = reply.message;
    }
  } catch (err: any) {
    status = 'failed';
    errorText = err?.message || "Erreur lors de l'exécution de la tâche.";
    message = errorText ?? '';
  }

  if (executionId) {
    await db
      .from('task_executions')
      .update({
        status,
        completed_at: new Date().toISOString(),
        result: status === 'completed' ? { message } : null,
        error: errorText,
      })
      .eq('id', executionId);
  }

  return { executionId, status, message };
}
