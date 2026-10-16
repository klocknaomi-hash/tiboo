/**
 * Muse AI Clone - Core Type Definitions & Data Contracts
 *
 * Centralized TypeScript interfaces and types for application state,
 * navigation, companion chat, scheduler tasks, ideas, and settings.
 */

/**
 * Message object representing a chat utterance in the conversation history (UI level).
 */
export interface ChatMessage {
  /** Unique identifier for the message */
  id: string;
  /** Origin of the message: 'user' for current user, 'agent' for the AI agent, or 'system' */
  sender: 'user' | 'agent' | 'system';
  /** Plaintext or markdown formatted message content */
  text: string;
  /** Formatted timestamp display string (e.g. "3:35 PM") */
  timestamp: string;
  /** Optional thread identifier matching Supabase chat_messages.threadId */
  threadId?: string;
  /** Optional raw ISO timestamp */
  createdAt?: string;
  /** Error notice (AI or server unavailable); shown but never sent back to the AI */
  isError?: boolean;
  /** Sensitive action waiting for the user's approval (not persisted) */
  pendingConfirmation?: {
    token: string;
    toolName: string;
    description: string;
    arguments: Record<string, unknown>;
  };
}

/**
 * Supabase `chat_messages` table row schema.
 * Matches: id, threadId, role, content, createdAt (+ user_id for RLS).
 */
export interface DbChatMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system' | 'agent';
  content: string;
  createdAt: string;
  user_id?: string | null;
}

/**
 * Conversation thread metadata (main chat or side chat)
 */
export interface ChatThread {
  /** Unique thread identifier */
  id: string;
  /** Title or subject of the conversation */
  title: string;
  /** ISO creation timestamp */
  createdAt: string;
  /** ISO last updated timestamp */
  updatedAt: string;
  /** Last message content preview */
  lastMessage?: string;
  /** Formatted time of last message (e.g. "14:32") */
  lastMessageTime?: string;
  /** User identifier for Supabase multi-tenant isolation */
  user_id?: string | null;
  /** Whether this is the default main conversation thread */
  isMainChat?: boolean;
}

/**
 * Chat topic item listed under "Side chats" in the sliding sidebar drawer.
 */
export interface SideChatItem {
  /** Unique identifier for the side chat thread */
  id: string;
  /** Title or subject of the side chat */
  title: string;
  /** Indicates whether unread updates exist in this side thread */
  hasUnreadDot?: boolean;
  /** ISO last updated timestamp */
  updatedAt?: string;
}

/**
 * Inspiration card template for the Ideas tab.
 */
export interface IdeaItem {
  /** Unique idea identifier */
  id: string;
  /** 3D emoji or icon representing the domain */
  icon: string;
  /** Prominent bold action title */
  title: string;
  /** Descriptive preview of what the agent will build or research */
  description: string;
  /** Full prompt automatically loaded into chat input upon selection */
  prompt: string;
}

/**
 * Status of scheduled goals or routines.
 */
export type TaskStatus = 'active' | 'paused' | 'done';

/**
 * Supabase `scheduled_tasks` table row schema.
 * Represents recurring autonomous AI agent tasks.
 */
export interface ScheduledTask {
  /** Unique task identifier (UUID) */
  id: string;
  /** Supabase Auth user ID (UUID) */
  user_id?: string | null;
  /** Target agent ID (UUID) */
  agent_id?: string | null;
  /** Optional human-readable title (e.g. "Vérification quotidienne Gmail") */
  title?: string;
  /** Core autonomous prompt / instruction for the agent */
  instruction: string;
  /** Standard 5-part cron expression (e.g. "0 9 * * *") */
  schedule: string;
  /** User or system timezone (e.g. "Europe/Paris", "UTC") */
  timezone: string;
  /** Whether the recurring schedule is currently enabled */
  is_active: boolean;
  /** ISO timestamp of the next due execution */
  next_run_at: string;
  /** ISO timestamp of the most recent execution */
  last_run_at?: string | null;
  /** Task status string ('active', 'paused', 'completed', etc.) */
  status: string;
  /** ISO creation timestamp */
  created_at?: string;
  /** ISO update timestamp */
  updated_at?: string;
}

/**
 * Execution status for individual scheduled task runs.
 */
export type TaskExecutionStatus = 'queued' | 'running' | 'completed' | 'failed';

/**
 * Supabase `task_executions` table row schema.
 * Stores individual runs, timing, results and errors.
 */
export interface TaskExecution {
  /** Unique execution record ID (UUID) */
  id: string;
  /** Foreign key referencing scheduled_tasks.id (UUID) */
  task_id: string;
  /** Execution lifecycle state */
  status: TaskExecutionStatus;
  /** JSON payload containing agent response, summary, tools used, etc. */
  result?: Record<string, any> | null;
  /** ISO timestamp when run was queued */
  created_at: string;
  /** ISO timestamp when agent started processing */
  started_at?: string | null;
  /** ISO timestamp when agent finished */
  completed_at?: string | null;
  /** Error message or stack trace if execution failed */
  error?: string | null;
  /** Joined or cached title of the scheduled task for display */
  task_title?: string;
}

/**
 * Scheduled goal or recurring autonomous workflow tracked in Tasks tab (legacy compatibility).
 */
export interface TaskGoalItem {
  /** Unique task identifier */
  id: string;
  /** Name of the goal or routine check */
  title: string;
  /** Frequency and time specification (e.g. "Every day @ 8:00 AM") */
  schedule: string;
  /** Current operating status */
  status: TaskStatus;
  /** Lifetime count of automated runs completed */
  runsCount: number;
}

/**
 * External workspace tool connector available in Settings.
 */
export interface ConnectorItem {
  /** Unique connector identifier */
  id: string;
  /** Tool brand name (e.g. "Google Workspace", "Notion") */
  name: string;
  /** Description of features enabled by connecting */
  description: string;
  /** Distinct brand background color for connector icon emblem */
  iconBg: string;
  /** Connection status */
  connected: boolean;
  /** Category grouping (e.g. "Productivity", "Developer", "Workspace") */
  category: string;
  /** Linked account identifier or email when active */
  accountEmail?: string;
}

/**
 * Account usage stats and quota details in Settings.
 */
export interface PlanData {
  planName: string;
  percentUsed: number;
  resetText: string;
  creditsUsed: number;
  creditsTotal: number;
  remainingCredits: number;
}

/**
 * Agent avatar source: a ready-made persona, the Tiboo mascot, name initials,
 * an emoji (legacy saved profiles) or a photo from the gallery.
 */
export type AgentAvatar =
  | { type: 'persona'; id: string }
  | { type: 'mascot' }
  | { type: 'initials' }
  | { type: 'emoji'; value: string }
  | { type: 'photo'; uri: string };

/**
 * Ready-made agent character (3D portrait + suggested name).
 */
export interface AgentPersona {
  id: string;
  name: string;
  image: any;
  role?: string;
  description?: string;
}


/**
 * Agent Mascot Customization parameters
 */
export interface AgentProfile {
  /** Display name shown in the header pill, drawer and chat */
  name: string;
  /** Short role / tagline (e.g. "Autonomous Agent", "Coach sportif") */
  subtitle: string;
  /** Avatar shown in the header, drawer and chat */
  avatar: AgentAvatar;
  /** Accent color applied to the avatar ring, send button and active tab */
  color: string;
  /** First agent message shown in the main chat */
  greeting: string;
}

/**
 * Valid navigation tab identifiers
 */
export type TabKey = 'chat' | 'feed' | 'ideas' | 'tasks' | 'settings';

/**
 * Tab dock destination item specification
 */
export interface TabItem {
  key: TabKey;
  label: string;
  route: string;
  icon: any;
}

/**
 * User account profile data stored in Supabase `profiles` table.
 */
export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at?: string;
}

