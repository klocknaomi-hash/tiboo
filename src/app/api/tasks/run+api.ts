/**
 * POST /api/tasks/run
 *
 * Server-side API route to execute a scheduled recurring task
 * with the autonomous agent using Composio MCP tools (Gmail, Calendar, Notion).
 *
 * Body: { "task": TaskGoalItem }
 * Reply: { "success": true, "result": RecurringTaskExecutionResult }
 */

import { executeScheduledTask } from '@/lib/agent/recurringTaskRunner';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const task = body?.task;

    if (!task || (!task.title && !task.instruction)) {
      return Response.json({ error: 'task object is required' }, { status: 400 });
    }

    const result = await executeScheduledTask(task);

    return Response.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('[api/tasks/run]', error);
    return Response.json(
      {
        error: error?.message || 'Failed to execute scheduled recurring task',
      },
      { status: 500 }
    );
  }
}
