/**
 * Recurring Scheduled Task Runner (Part 5 & 6)
 *
 * Reuses the EXACT same agent and Composio MCP tools (Gmail, Calendar, Notion, etc.)
 * to execute autonomous scheduled routines and background goal runs.
 */

import { TaskGoalItem } from '@/types';
import { composioTools } from '../composio/tools';
import { askAgent, TibooResponse } from './index';

export interface RecurringTaskExecutionResult {
  taskId: string;
  taskTitle: string;
  executedAt: string;
  success: boolean;
  agentResponse: TibooResponse;
  toolsUsed: string[];
}

export type SchedulableTask =
  | TaskGoalItem
  | { id: string; title?: string; instruction?: string; schedule: string };

/**
 * Maps a scheduled task goal to an actionable prompt for the agent
 */
export function buildPromptForScheduledTask(task: SchedulableTask): string {
  if ('instruction' in task && task.instruction && task.instruction.trim().length > 0) {
    return (
      `Exécute la tâche récurrente planifiée "${task.title || 'Automatisation'}". ` +
      `Instruction : "${task.instruction}". ` +
      `Utilise les outils connectés nécessaires (Gmail, Calendar, Notion, etc.) et fournis une réponse structurée, claire et utile.`
    );
  }

  const title = task.title || 'Routine';
  const lower = title.toLowerCase();

  if (lower.includes('briefing') || lower.includes('matin') || lower.includes('morning')) {
    return (
      `Exécute la tâche planifiée "${title}". ` +
      `Consulte mes 5 derniers emails non lus sur Gmail et mes 3 prochains événements Google Calendar, ` +
      `puis rédige un briefing matinal synthétique et chaleureux.`
    );
  }

  if (lower.includes('notion') || lower.includes('revue') || lower.includes('projet') || lower.includes('docs')) {
    return (
      `Exécute la tâche planifiée "${title}". ` +
      `Cherche mes documents de projet récents dans Notion et fais-moi un point d'avancement clair.`
    );
  }

  if (lower.includes('mail') || lower.includes('email') || lower.includes('inbox')) {
    return (
      `Exécute la tâche planifiée "${title}". ` +
      `Vérifie les nouveaux emails prioritaires dans Gmail et résume les urgences.`
    );
  }

  return (
    `Exécute la routine planifiée "${title}" programmée pour "${task.schedule}". ` +
    `Utilise les outils connectés nécessaires (Gmail, Calendar, Notion) et fournis un compte-rendu clair.`
  );
}

/**
 * Executes a scheduled recurring task with the autonomous agent
 * using the unified Composio MCP tools suite.
 */
export async function executeScheduledTask(
  task: SchedulableTask
): Promise<RecurringTaskExecutionResult> {
  const prompt = buildPromptForScheduledTask(task);
  const response = await askAgent(prompt);

  // Identify which Composio tools match the execution
  const toolsUsed: string[] = [];
  if (response.actionTaken?.includes('Gmail')) toolsUsed.push('composio_gmail');
  if (response.actionTaken?.includes('Calendar')) toolsUsed.push('composio_google_calendar');
  if (response.actionTaken?.includes('Notion')) toolsUsed.push('composio_notion');
  if (toolsUsed.length === 0) {
    toolsUsed.push(composioTools[0].name);
  }

  return {
    taskId: task.id,
    taskTitle: task.title || 'Routine',
    executedAt: new Date().toISOString(),
    success: true,
    agentResponse: response,
    toolsUsed,
  };
}
