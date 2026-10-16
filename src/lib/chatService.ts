/**
 * Chat Persistence Service
 *
 * Handles database persistence for all conversations (Main Chat + SideChats):
 * 1. Supabase table "chat_messages": id, threadId, role, content, createdAt (+ user_id for RLS)
 * 2. Supabase table "chat_threads": id, title, created_at, updated_at
 * 3. Local-first AsyncStorage fallback so offline / guest sessions persist flawlessly
 * 4. Helper utilities: thread grouping by day (Aujourd'hui / Hier), date formatters
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { ChatMessage, ChatThread, DbChatMessage } from '@/types';
import { INITIAL_CHAT_MESSAGES, SIDE_CHATS } from '@/constants/dummyData';

const STORAGE_KEYS = {
  THREADS: '@tiboo_chat_threads_v1',
  MESSAGES_PREFIX: '@tiboo_chat_msgs_',
  ACTIVE_THREAD: '@tiboo_active_thread_id',
};

/** Default main chat thread identifier */
export const MAIN_THREAD_ID = 'main';

/**
 * Format timestamp display (e.g. "14:32" or "3:35 PM")
 */
export function formatDisplayTime(dateInput?: string | Date): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Converts a database row to a UI-friendly ChatMessage
 */
export function dbMessageToUi(msg: DbChatMessage): ChatMessage {
  const roleToSender: Record<string, 'user' | 'agent' | 'system'> = {
    user: 'user',
    assistant: 'agent',
    agent: 'agent',
    system: 'system',
  };

  return {
    id: msg.id,
    threadId: msg.threadId,
    sender: roleToSender[msg.role] || 'agent',
    text: msg.content,
    timestamp: formatDisplayTime(msg.createdAt),
    createdAt: msg.createdAt,
  };
}

/**
 * Converts a UI ChatMessage to a database row
 */
export function uiMessageToDb(
  msg: ChatMessage,
  threadId: string,
  userId?: string | null
): DbChatMessage {
  const senderToRole: Record<string, 'user' | 'assistant' | 'system'> = {
    user: 'user',
    agent: 'assistant',
    system: 'system',
  };

  return {
    id: msg.id,
    threadId,
    role: senderToRole[msg.sender] || 'assistant',
    content: msg.text,
    createdAt: msg.createdAt || new Date().toISOString(),
    user_id: userId ?? null,
  };
}

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
 * Generate a random UUID-like string for local keys or message IDs
 */
export function generateId(prefix: string = 'msg'): string {
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${Date.now()}-${randomPart}`;
}

// -----------------------------------------------------------------------------
// THREADS MANAGEMENT
// -----------------------------------------------------------------------------

/**
 * Initial seed threads (Main Chat + sample side chats)
 */
function getInitialSeedThreads(): ChatThread[] {
  const now = new Date();
  const mainThread: ChatThread = {
    id: MAIN_THREAD_ID,
    title: 'Main chat',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lastMessage: "I'd love to help with that. In your own words, what would this health goal be about?",
    lastMessageTime: formatDisplayTime(now),
    isMainChat: true,
  };

  const sideThreads: ChatThread[] = SIDE_CHATS.map((side, idx) => {
    const pastDate = new Date(Date.now() - (idx + 1) * 3600 * 1000 * (idx > 2 ? 26 : 2));
    return {
      id: side.id,
      title: side.title,
      createdAt: pastDate.toISOString(),
      updatedAt: pastDate.toISOString(),
      lastMessage: `Discussion autour de : ${side.title}`,
      lastMessageTime: formatDisplayTime(pastDate),
      isMainChat: false,
    };
  });

  return [mainThread, ...sideThreads];
}

/**
 * Load all conversation threads (Supabase remote + AsyncStorage local)
 */
export async function getChatThreads(): Promise<ChatThread[]> {
  const userId = await getCurrentUserId();
  let remoteThreads: ChatThread[] = [];

  // 1. Try Supabase remote fetch
  try {
    let query = supabase.from('chat_threads').select('*').order('updated_at', { ascending: false });
    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }
    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      remoteThreads = data.map((t: any) => ({
        id: t.id,
        title: t.title,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        user_id: t.user_id,
        isMainChat: t.id === MAIN_THREAD_ID,
      }));
    }
  } catch (err) {
    console.warn('[chatService] Remote threads fetch error:', err);
  }

  // 2. Load local AsyncStorage cache
  let localThreads: ChatThread[] = [];
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.THREADS);
    if (raw) {
      localThreads = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[chatService] Local threads cache error:', err);
  }

  // If both empty, seed initial default threads
  if (remoteThreads.length === 0 && localThreads.length === 0) {
    const seeds = getInitialSeedThreads();
    await AsyncStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(seeds));
    return seeds;
  }

  // Merge remote and local (remote takes precedence for matching IDs)
  const map = new Map<string, ChatThread>();
  for (const t of localThreads) {
    map.set(t.id, t);
  }
  for (const t of remoteThreads) {
    const existing = map.get(t.id);
    map.set(t.id, {
      ...existing,
      ...t,
      lastMessage: existing?.lastMessage ?? t.lastMessage,
      lastMessageTime: existing?.lastMessageTime ?? formatDisplayTime(t.updatedAt),
    });
  }

  // Ensure Main Chat always exists
  if (!map.has(MAIN_THREAD_ID)) {
    const now = new Date().toISOString();
    map.set(MAIN_THREAD_ID, {
      id: MAIN_THREAD_ID,
      title: 'Main chat',
      createdAt: now,
      updatedAt: now,
      isMainChat: true,
    });
  }

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // Sync back to local storage
  await AsyncStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(merged)).catch(() => {});
  return merged;
}

/**
 * Creates a brand new conversation thread with unique threadId
 */
export async function createChatThread(customTitle?: string): Promise<ChatThread> {
  const userId = await getCurrentUserId();
  const threadId = `thread-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newThread: ChatThread = {
    id: threadId,
    title: customTitle?.trim() || 'Nouvelle discussion',
    createdAt: now,
    updatedAt: now,
    lastMessage: '',
    lastMessageTime: formatDisplayTime(now),
    user_id: userId,
    isMainChat: false,
  };

  // 1. Save to local storage immediately
  try {
    const existing = await getChatThreads();
    const updated = [newThread, ...existing.filter((t) => t.id !== threadId)];
    await AsyncStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(updated));
  } catch (err) {
    console.warn('[chatService] Failed to cache new thread locally:', err);
  }

  // 2. Save to Supabase remote
  try {
    await supabase.from('chat_threads').insert({
      id: newThread.id,
      title: newThread.title,
      created_at: newThread.createdAt,
      updated_at: newThread.updatedAt,
      user_id: userId,
    });
  } catch (err) {
    console.warn('[chatService] Remote thread creation error (offline/pending):', err);
  }

  return newThread;
}

/**
 * Renames a conversation thread
 */
export async function renameChatThread(threadId: string, newTitle: string): Promise<void> {
  const trimmed = newTitle.trim();
  if (!trimmed) return;

  const now = new Date().toISOString();

  // 1. Update local cache
  try {
    const threads = await getChatThreads();
    const updated = threads.map((t) => (t.id === threadId ? { ...t, title: trimmed, updatedAt: now } : t));
    await AsyncStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(updated));
  } catch (err) {
    console.warn('[chatService] Failed to rename locally:', err);
  }

  // 2. Update Supabase remote
  try {
    await supabase
      .from('chat_threads')
      .update({ title: trimmed, updated_at: now })
      .eq('id', threadId);
  } catch (err) {
    console.warn('[chatService] Failed to rename remotely:', err);
  }
}

/**
 * Deletes a conversation thread and all its messages
 */
export async function deleteChatThread(threadId: string): Promise<void> {
  // 1. Remove from local storage
  try {
    const threads = await getChatThreads();
    const updated = threads.filter((t) => t.id !== threadId);
    await AsyncStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(updated));
    await AsyncStorage.removeItem(`${STORAGE_KEYS.MESSAGES_PREFIX}${threadId}`);
  } catch (err) {
    console.warn('[chatService] Failed to delete locally:', err);
  }

  // 2. Remove from Supabase remote
  try {
    await supabase.from('chat_messages').delete().eq('threadId', threadId);
    await supabase.from('chat_threads').delete().eq('id', threadId);
  } catch (err) {
    console.warn('[chatService] Failed to delete remotely:', err);
  }
}

// -----------------------------------------------------------------------------
// MESSAGES MANAGEMENT
// -----------------------------------------------------------------------------

/**
 * Load all messages belonging to a specific threadId
 */
export async function getChatMessages(threadId: string): Promise<ChatMessage[]> {
  const userId = await getCurrentUserId();
  let remoteMessages: ChatMessage[] = [];

  // 1. Try fetching from Supabase table "chat_messages"
  try {
    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('threadId', threadId)
      .order('createdAt', { ascending: true });

    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      remoteMessages = data.map((row: any) =>
        dbMessageToUi({
          id: row.id,
          threadId: row.threadId,
          role: row.role,
          content: row.content,
          createdAt: row.createdAt || row.created_at,
          user_id: row.user_id,
        })
      );
    }
  } catch (err) {
    console.warn('[chatService] Remote messages fetch error:', err);
  }

  // 2. Try loading from local AsyncStorage cache
  let localMessages: ChatMessage[] = [];
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEYS.MESSAGES_PREFIX}${threadId}`);
    if (raw) {
      localMessages = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[chatService] Local messages fetch error:', err);
  }

  if (remoteMessages.length > 0) {
    // Sync remote into local cache
    await AsyncStorage.setItem(
      `${STORAGE_KEYS.MESSAGES_PREFIX}${threadId}`,
      JSON.stringify(remoteMessages)
    ).catch(() => {});
    return remoteMessages;
  }

  if (localMessages.length > 0) {
    return localMessages;
  }

  // If Main Chat has no messages yet, return default seed messages
  if (threadId === MAIN_THREAD_ID) {
    const seeds = INITIAL_CHAT_MESSAGES.map((m) => ({
      ...m,
      threadId: MAIN_THREAD_ID,
      createdAt: new Date().toISOString(),
    }));
    await AsyncStorage.setItem(
      `${STORAGE_KEYS.MESSAGES_PREFIX}${MAIN_THREAD_ID}`,
      JSON.stringify(seeds)
    ).catch(() => {});
    return seeds;
  }

  return [];
}

/**
 * Saves a single message to Supabase table "chat_messages" & local cache.
 * Updates the thread's last message and updatedAt timestamp.
 */
export async function saveChatMessage(params: {
  threadId: string;
  role: 'user' | 'assistant' | 'system' | 'agent';
  content: string;
  id?: string;
  createdAt?: string;
}): Promise<ChatMessage> {
  const userId = await getCurrentUserId();
  const id = params.id || generateId('msg');
  const createdAt = params.createdAt || new Date().toISOString();
  const normalizedRole = params.role === 'agent' ? 'assistant' : params.role;

  const dbRow: DbChatMessage = {
    id,
    threadId: params.threadId,
    role: normalizedRole,
    content: params.content,
    createdAt,
    user_id: userId,
  };

  const uiMsg = dbMessageToUi(dbRow);

  // 1. Immediately append to local AsyncStorage cache
  try {
    const localKey = `${STORAGE_KEYS.MESSAGES_PREFIX}${params.threadId}`;
    const raw = await AsyncStorage.getItem(localKey);
    const list: ChatMessage[] = raw ? JSON.parse(raw) : [];
    const updatedList = [...list.filter((m) => m.id !== id), uiMsg];
    await AsyncStorage.setItem(localKey, JSON.stringify(updatedList));

    // Update thread preview in local threads list
    const threadsRaw = await AsyncStorage.getItem(STORAGE_KEYS.THREADS);
    if (threadsRaw) {
      const threads: ChatThread[] = JSON.parse(threadsRaw);
      const updatedThreads = threads.map((t) => {
        if (t.id === params.threadId) {
          // If first user message on a generic title, update title
          const newTitle =
            t.title === 'Nouvelle discussion' && params.role === 'user'
              ? params.content.slice(0, 36)
              : t.title;

          return {
            ...t,
            title: newTitle,
            lastMessage: params.content,
            lastMessageTime: formatDisplayTime(createdAt),
            updatedAt: createdAt,
          };
        }
        return t;
      });
      await AsyncStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(updatedThreads));
    }
  } catch (err) {
    console.warn('[chatService] Local message cache save error:', err);
  }

  // 2. Persist to Supabase table "chat_messages"
  try {
    // Also ensure the parent chat_threads record exists remotely
    await supabase.from('chat_threads').upsert(
      {
        id: params.threadId,
        title: params.threadId === MAIN_THREAD_ID ? 'Main chat' : params.content.slice(0, 36),
        updated_at: createdAt,
        user_id: userId,
      },
      { onConflict: 'id' }
    );

    const { error } = await supabase.from('chat_messages').insert({
      id: dbRow.id,
      threadId: dbRow.threadId,
      role: dbRow.role,
      content: dbRow.content,
      createdAt: dbRow.createdAt,
      user_id: dbRow.user_id,
    });

    if (error) {
      console.warn('[chatService] Supabase chat_messages insert error:', error.message);
    }
  } catch (err: any) {
    console.warn('[chatService] Remote message persistence failed (offline fallback active):', err?.message);
  }

  return uiMsg;
}

/**
 * Clears all messages for a specific conversation thread
 */
export async function clearThreadMessages(threadId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${STORAGE_KEYS.MESSAGES_PREFIX}${threadId}`);
    await supabase.from('chat_messages').delete().eq('threadId', threadId);
  } catch (err) {
    console.warn('[chatService] Error clearing messages:', err);
  }
}

// -----------------------------------------------------------------------------
// HISTORY GROUPING HELPER (Requirement 4: Aujourd'hui / Hier)
// -----------------------------------------------------------------------------

export interface ThreadDateGroup {
  title: string;
  data: ChatThread[];
}

/**
 * Groups a list of conversation threads by day:
 * - "Aujourd'hui"
 * - "Hier"
 * - "7 derniers jours"
 * - "Plus ancien"
 */
export function groupThreadsByDay(threads: ChatThread[]): ThreadDateGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const groups: { [key: string]: ChatThread[] } = {
    "Aujourd'hui": [],
    Hier: [],
    '7 derniers jours': [],
    'Plus ancien': [],
  };

  for (const thread of threads) {
    const threadDate = new Date(thread.updatedAt || thread.createdAt);
    threadDate.setHours(0, 0, 0, 0);

    const time = threadDate.getTime();
    if (time >= today.getTime()) {
      groups["Aujourd'hui"].push(thread);
    } else if (time >= yesterday.getTime()) {
      groups['Hier'].push(thread);
    } else if (time >= sevenDaysAgo.getTime()) {
      groups['7 derniers jours'].push(thread);
    } else {
      groups['Plus ancien'].push(thread);
    }
  }

  const result: ThreadDateGroup[] = [];
  if (groups["Aujourd'hui"].length > 0) {
    result.push({ title: "Aujourd'hui", data: groups["Aujourd'hui"] });
  }
  if (groups['Hier'].length > 0) {
    result.push({ title: 'Hier', data: groups['Hier'] });
  }
  if (groups['7 derniers jours'].length > 0) {
    result.push({ title: '7 derniers jours', data: groups['7 derniers jours'] });
  }
  if (groups['Plus ancien'].length > 0) {
    result.push({ title: 'Plus ancien', data: groups['Plus ancien'] });
  }

  return result;
}
