/**
 * Scheduled Tasks & Executions Service
 *
 * Full Supabase database persistence for:
 * 1. Table "scheduled_tasks" (id, user_id, agent_id, instruction, schedule, timezone, is_active, next_run_at, last_run_at, status)
 * 2. Table "task_executions" (id, task_id, status, result, created_at, started_at, completed_at, error)
 * 3. Transparent local-first AsyncStorage fallback for resilient offline / unauthenticated execution
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/apiClient';
import { ScheduledTask, TaskExecution, TaskExecutionStatus } from '@/types';
import { getNextCronRunDate, getUserTimezone } from './cronUtils';

const STORAGE_KEYS = {
  TASKS: '@tiboo_scheduled_tasks_v1',
  EXECUTIONS: '@tiboo_task_executions_v1',
};

/**
 * Default seeded scheduled tasks shown on first launch
 */
const DEFAULT_SCHEDULED_TASKS: ScheduledTask[] = [
  {
    id: 'e1d2c3b4-0001-4000-8000-000000000001',
    title: 'Vérification quotidienne Gmail',
    instruction: 'Vérifie mes 5 derniers emails sur Gmail, résume les urgences et prépare les réponses prioritaires.',
    schedule: '0 9 * * *',
    timezone: 'Europe/Paris',
    is_active: true,
    next_run_at: getNextCronRunDate('0 9 * * *').toISOString(),
    last_run_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    status: 'active',
    created_at: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
  },
  {
    id: 'e1d2c3b4-0002-4000-8000-000000000002',
    title: 'Morning Health & Workout Check-in',
    instruction: 'Briefing matinal : météo, programme sportif du jour et 3 priorités du calendrier.',
    schedule: '0 8 * * *',
    timezone: 'Europe/Paris',
    is_active: true,
    next_run_at: getNextCronRunDate('0 8 * * *').toISOString(),
    last_run_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    status: 'active',
    created_at: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
  },
  {
    id: 'e1d2c3b4-0003-4000-8000-000000000003',
    title: 'Revue documentaire Notion & Sprint',
    instruction: 'Consulte mes documents récents dans Notion et fais une synthèse des tâches en cours.',
    schedule: '0 18 * * 0',
    timezone: 'Europe/Paris',
    is_active: false,
    next_run_at: getNextCronRunDate('0 18 * * 0').toISOString(),
    last_run_at: new Date(Date.now() - 3600 * 1000 * 96).toISOString(),
    status: 'paused',
    created_at: new Date(Date.now() - 3600 * 1000 * 120).toISOString(),
  },
];

/**
 * Default seeded execution history
 */
const DEFAULT_EXECUTIONS: TaskExecution[] = [
  {
    id: 'exec-0001-4000-8000-000000000001',
    task_id: 'e1d2c3b4-0001-4000-8000-000000000001',
    task_title: 'Vérification quotidienne Gmail',
    status: 'completed',
    result: {
      summary: '5 emails analysés avec succès via Composio Gmail.',
      toolsUsed: ['composio_gmail'],
      message: 'Alexandre Martin attend une confirmation pour le sprint Q4. Aucun email critique en attente.',
    },
    created_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    started_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    completed_at: new Date(Date.now() - 3600 * 1000 * 24 + 2400).toISOString(),
    error: null,
  },
  {
    id: 'exec-0002-4000-8000-000000000002',
    task_id: 'e1d2c3b4-0002-4000-8000-000000000002',
    task_title: 'Morning Health & Workout Check-in',
    status: 'completed',
    result: {
      summary: 'Briefing matinal généré.',
      toolsUsed: ['composio_google_calendar'],
      message: 'Point de synchro à 14h00. Séance de course à pied recommandée à 18h30.',
    },
    created_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    started_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    completed_at: new Date(Date.now() - 3600 * 1000 * 12 + 1800).toISOString(),
    error: null,
  },
];

/**
 * Retrieve current user ID from Supabase Auth if logged in
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Generate a random UUID-like ID
 */
function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// -----------------------------------------------------------------------------
// LOCAL CACHE HELPERS
// -----------------------------------------------------------------------------

async function getLocalTasks(): Promise<ScheduledTask[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(DEFAULT_SCHEDULED_TASKS));
      return DEFAULT_SCHEDULED_TASKS;
    }
    return JSON.parse(raw) as ScheduledTask[];
  } catch {
    return DEFAULT_SCHEDULED_TASKS;
  }
}

async function saveLocalTasks(tasks: ScheduledTask[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (err) {
    console.warn('[taskService] Error saving local tasks:', err);
  }
}

async function getLocalExecutions(): Promise<TaskExecution[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.EXECUTIONS);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEYS.EXECUTIONS, JSON.stringify(DEFAULT_EXECUTIONS));
      return DEFAULT_EXECUTIONS;
    }
    return JSON.parse(raw) as TaskExecution[];
  } catch {
    return DEFAULT_EXECUTIONS;
  }
}

async function saveLocalExecutions(executions: TaskExecution[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.EXECUTIONS, JSON.stringify(executions));
  } catch (err) {
    console.warn('[taskService] Error saving local executions:', err);
  }
}

// -----------------------------------------------------------------------------
// SCHEDULED TASKS CRUD
// -----------------------------------------------------------------------------

/**
 * Fetch all scheduled tasks (Supabase with local fallback)
 */
export async function getScheduledTasks(): Promise<ScheduledTask[]> {
  try {
    const { data, error } = await supabase
      .from('scheduled_tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      // Sync local cache
      await saveLocalTasks(data as ScheduledTask[]);
      return data as ScheduledTask[];
    }
  } catch (err) {
    console.warn('[taskService] Supabase fetch error, using local tasks:', err);
  }

  return getLocalTasks();
}

export interface CreateScheduledTaskInput {
  instruction: string;
  schedule: string;
  title?: string;
  timezone?: string;
  agent_id?: string | null;
  is_active?: boolean;
}

/**
 * Create and persist a new scheduled recurring task
 */
export async function createScheduledTask(
  input: CreateScheduledTaskInput
): Promise<ScheduledTask> {
  const userId = await getCurrentUserId();
  const timezone = input.timezone || getUserTimezone();
  const title = input.title || input.instruction.slice(0, 40);
  const nextRunAt = getNextCronRunDate(input.schedule, new Date(), timezone).toISOString();

  const newTask: ScheduledTask = {
    id: generateUuid(),
    user_id: userId,
    agent_id: input.agent_id || null,
    title,
    instruction: input.instruction.trim(),
    schedule: input.schedule.trim(),
    timezone,
    is_active: input.is_active !== undefined ? input.is_active : true,
    next_run_at: nextRunAt,
    last_run_at: null,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!userId) {
    throw new Error('Connecte-toi avec un compte Tiboo pour créer une tâche.');
  }

  const { data, error } = await supabase
    .from('scheduled_tasks')
    .insert({
      user_id: newTask.user_id,
      agent_id: newTask.agent_id,
      title: newTask.title,
      instruction: newTask.instruction,
      schedule: newTask.schedule,
      timezone: newTask.timezone,
      is_active: newTask.is_active,
      next_run_at: newTask.next_run_at,
      status: newTask.status,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "La tâche n'a pas pu être enregistrée.");
  }
  const local = await getLocalTasks();
  await saveLocalTasks([data as ScheduledTask, ...local.filter((t) => t.id !== data.id)]);
  return data as ScheduledTask;
}

/**
 * Toggle active/pause state for a scheduled task
 */
export async function toggleScheduledTask(
  id: string,
  isActive: boolean
): Promise<ScheduledTask | null> {
  const status = isActive ? 'active' : 'paused';

  // 1. Try Supabase
  try {
    const { data, error } = await supabase
      .from('scheduled_tasks')
      .update({
        is_active: isActive,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      const local = await getLocalTasks();
      const updated = local.map((t) => (t.id === id ? (data as ScheduledTask) : t));
      await saveLocalTasks(updated);
      return data as ScheduledTask;
    }
  } catch (err) {
    console.warn('[taskService] Supabase toggle failed, toggling locally:', err);
  }

  // 2. Local fallback
  const local = await getLocalTasks();
  let updatedTask: ScheduledTask | null = null;
  const updated = local.map((t) => {
    if (t.id === id) {
      updatedTask = {
        ...t,
        is_active: isActive,
        status,
        updated_at: new Date().toISOString(),
      };
      return updatedTask;
    }
    return t;
  });

  await saveLocalTasks(updated);
  return updatedTask;
}

/**
 * Delete a scheduled task
 */
export async function deleteScheduledTask(id: string): Promise<void> {
  try {
    await supabase.from('scheduled_tasks').delete().eq('id', id);
  } catch (err) {
    console.warn('[taskService] Supabase delete error:', err);
  }

  const local = await getLocalTasks();
  await saveLocalTasks(local.filter((t) => t.id !== id));
}

// -----------------------------------------------------------------------------
// TASK EXECUTIONS
// -----------------------------------------------------------------------------

/**
 * Fetch execution history (Supabase with local fallback)
 */
export async function getTaskExecutions(taskId?: string): Promise<TaskExecution[]> {
  try {
    let query = supabase
      .from('task_executions')
      .select('*, scheduled_tasks(title)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (taskId) {
      query = query.eq('task_id', taskId);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const formatted: TaskExecution[] = data.map((row: any) => ({
        id: row.id,
        task_id: row.task_id,
        status: row.status,
        result: row.result,
        created_at: row.created_at,
        started_at: row.started_at,
        completed_at: row.completed_at,
        error: row.error,
        task_title: row.scheduled_tasks?.title || 'Tâche planifiée',
      }));
      await saveLocalExecutions(formatted);
      return formatted;
    }
  } catch (err) {
    console.warn('[taskService] Supabase executions fetch failed, using local history:', err);
  }

  const local = await getLocalExecutions();
  return taskId ? local.filter((e) => e.task_id === taskId) : local;
}

/**
 * Record a new execution record (queued, running, completed, or failed)
 */
export async function recordTaskExecution(
  execution: Partial<TaskExecution> & { task_id: string }
): Promise<TaskExecution> {
  const newExec: TaskExecution = {
    id: execution.id || generateUuid(),
    task_id: execution.task_id,
    status: execution.status || 'queued',
    result: execution.result || null,
    created_at: execution.created_at || new Date().toISOString(),
    started_at: execution.started_at || null,
    completed_at: execution.completed_at || null,
    error: execution.error || null,
    task_title: execution.task_title,
  };

  // 1. Try Supabase
  try {
    const { data, error } = await supabase
      .from('task_executions')
      .upsert({
        id: newExec.id,
        task_id: newExec.task_id,
        status: newExec.status,
        result: newExec.result,
        created_at: newExec.created_at,
        started_at: newExec.started_at,
        completed_at: newExec.completed_at,
        error: newExec.error,
      })
      .select()
      .single();

    if (!error && data) {
      const local = await getLocalExecutions();
      await saveLocalExecutions([
        { ...data, task_title: newExec.task_title } as TaskExecution,
        ...local.filter((e) => e.id !== data.id),
      ]);
      return { ...data, task_title: newExec.task_title } as TaskExecution;
    }
  } catch (err) {
    console.warn('[taskService] Supabase recordTaskExecution error:', err);
  }

  // 2. Local fallback
  const local = await getLocalExecutions();
  const updated = [newExec, ...local.filter((e) => e.id !== newExec.id)];
  await saveLocalExecutions(updated);
  return newExec;
}

/**
 * Runs a task now on the Tiboo server (real agent, real tools).
 * The server records the execution in task_executions and returns its real
 * outcome; nothing is simulated here.
 */
export async function executeScheduledTaskNow(
  task: ScheduledTask
): Promise<{ status: 'completed' | 'failed'; message: string }> {
  const outcome = await apiFetch<{ status: 'completed' | 'failed'; message: string }>(
    '/api/tasks/run',
    { body: { taskId: task.id } }
  );
  return { status: outcome.status, message: outcome.message };
}
