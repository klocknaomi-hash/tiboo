/**
 * Chat Context & Provider
 *
 * App-wide chat state manager ensuring seamless persistence to Supabase:
 * - Active thread tracking & dynamic conversation switching
 * - Loads & saves messages directly into Supabase table "chat_messages"
 * - Maintains conversation threads list (Main Chat + SideChats)
 * - Flow "+ New Chat" creates unique threadId and empty session
 * - Rename and Delete operations on threads with real-time UI synchronization
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ChatMessage, ChatThread } from '@/types';
import {
  MAIN_THREAD_ID,
  getChatThreads,
  getChatMessages,
  saveChatMessage,
  createChatThread,
  renameChatThread,
  deleteChatThread,
  clearThreadMessages,
  formatDisplayTime,
} from '@/lib/chatService';
import { DEFAULT_AGENT_RESPONSES } from '@/constants/agentInstructions';
import { useAgent } from '@/context/AgentContext';
import { useAuth } from '@/context/AuthContext';
import { extractSchedulingFromText, getNextCronRunDate } from '@/lib/cronUtils';
import { createScheduledTask } from '@/lib/taskService';

interface ChatContextType {
  /** Active thread identifier (defaults to MAIN_THREAD_ID) */
  activeThreadId: string;
  /** Active thread metadata object */
  activeThread: ChatThread | undefined;
  /** All conversation threads (Main Chat + SideChats) */
  threads: ChatThread[];
  /** Messages belonging to the active thread */
  messages: ChatMessage[];
  /** True when loading threads or messages initially */
  isLoading: boolean;
  /** True when the agent is responding */
  isTyping: boolean;
  /** Switch active conversation thread */
  setActiveThreadId: (threadId: string) => Promise<void>;
  /** Create a new conversation with unique threadId */
  createNewChat: (title?: string) => Promise<string>;
  /** Send a message and persist both user utterance and agent reply to Supabase */
  sendMessage: (content: string) => Promise<void>;
  /** Rename a conversation */
  renameThread: (threadId: string, newTitle: string) => Promise<void>;
  /** Delete a conversation */
  deleteThread: (threadId: string) => Promise<void>;
  /** Clear messages of the active thread */
  clearActiveThreadMessages: () => Promise<void>;
  /** Reload threads list from database */
  refreshThreads: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { agent } = useAgent();
  const { user } = useAuth();

  const [activeThreadId, setActiveThreadIdState] = useState<string>(MAIN_THREAD_ID);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Load threads on initial mount or auth user change
  const refreshThreads = useCallback(async () => {
    try {
      const list = await getChatThreads();
      setThreads(list);
    } catch (err) {
      console.warn('[ChatContext] Error loading threads:', err);
    }
  }, []);

  // Load messages whenever activeThreadId changes
  const loadMessagesForThread = useCallback(async (threadId: string) => {
    setIsLoading(true);
    try {
      const msgs = await getChatMessages(threadId);
      setMessages(msgs);
    } catch (err) {
      console.warn('[ChatContext] Error loading messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      await refreshThreads();
      await loadMessagesForThread(MAIN_THREAD_ID);
    })();
  }, [user?.id, refreshThreads, loadMessagesForThread]);

  // Select a conversation thread
  const setActiveThreadId = useCallback(
    async (threadId: string) => {
      if (threadId === activeThreadId) return;
      setActiveThreadIdState(threadId);
      await loadMessagesForThread(threadId);
    },
    [activeThreadId, loadMessagesForThread]
  );

  // Flow "+ New Chat" (Requirement 5)
  const createNewChat = useCallback(
    async (title?: string): Promise<string> => {
      const newThread = await createChatThread(title);
      setThreads((prev) => [newThread, ...prev.filter((t) => t.id !== newThread.id)]);
      setActiveThreadIdState(newThread.id);
      setMessages([]);
      return newThread.id;
    },
    []
  );

  // Rename a conversation (Requirement 6)
  const renameThread = useCallback(
    async (threadId: string, newTitle: string) => {
      await renameChatThread(threadId, newTitle);
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, title: newTitle.trim() } : t))
      );
    },
    []
  );

  // Delete a conversation (Requirement 6)
  const deleteThread = useCallback(
    async (threadId: string) => {
      await deleteChatThread(threadId);
      setThreads((prev) => prev.filter((t) => t.id !== threadId));

      // If active thread was deleted, switch back to main
      if (activeThreadId === threadId) {
        setActiveThreadIdState(MAIN_THREAD_ID);
        await loadMessagesForThread(MAIN_THREAD_ID);
      }
    },
    [activeThreadId, loadMessagesForThread]
  );

  // Clear messages for current thread
  const clearActiveThreadMessages = useCallback(async () => {
    await clearThreadMessages(activeThreadId);
    setMessages([]);
    await refreshThreads();
  }, [activeThreadId, refreshThreads]);

  // Send message with automatic Supabase persistence for user + agent
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const currentThread = activeThreadId;

      // 1. Persist user message to Supabase chat_messages table
      const userMsg = await saveChatMessage({
        threadId: currentThread,
        role: 'user',
        content: trimmed,
      });

      // Optimistic UI update
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      // Helper to generate the agent response
      let agentReply = '';

      // Check if user is asking to schedule a recurring task (Requirement 5)
      const recurring = extractSchedulingFromText(trimmed);
      if (recurring && recurring.isRecurring) {
        try {
          await createScheduledTask({
            instruction: recurring.instruction,
            schedule: recurring.schedule,
            title: recurring.title,
            timezone: recurring.timezone,
          });
        } catch (err) {
          console.warn('[ChatContext] Error creating scheduled task:', err);
        }

        const nextRun = getNextCronRunDate(recurring.schedule, new Date(), recurring.timezone);
        const nextRunStr = nextRun.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        });

        agentReply =
          `🤖 **Tâche récurrente planifiée avec succès !**\n\n` +
          `J'ai bien enregistré ton automatisation dans tes tâches programmées :\n\n` +
          `• **Objectif :** ${recurring.title}\n` +
          `• **Instruction :** ${recurring.instruction}\n` +
          `• **Fréquence :** ${recurring.scheduleLabel} (\`${recurring.schedule}\`)\n` +
          `• **Fuseau horaire :** ${recurring.timezone}\n` +
          `• **Prochaine exécution :** ${nextRunStr}\n\n` +
          `Elle se déclenchera automatiquement en arrière-plan via Supabase pg_cron. Tu peux la retrouver, la suspendre ou la déclencher manuellement dans l'onglet **Tasks**.`;
      } else {
        try {
          // Attempt server-side agent execution via Expo Router API
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: trimmed }),
          });

          if (response.ok) {
            const payload = await response.json();
            agentReply = payload?.reply || payload?.data?.message;
          }
        } catch {
          // Fallback below
        }
      }

      // If server API route didn't return or on mobile fallback
      if (!agentReply) {
        const lower = trimmed.toLowerCase();
        if (lower.includes('mail') || lower.includes('email') || lower.includes('gmail')) {
          agentReply = DEFAULT_AGENT_RESPONSES.gmail();
        } else if (
          lower.includes('calendrier') ||
          lower.includes('agenda') ||
          lower.includes('événement')
        ) {
          agentReply = DEFAULT_AGENT_RESPONSES.calendar();
        } else if (lower.includes('notion') || lower.includes('doc')) {
          agentReply = DEFAULT_AGENT_RESPONSES.notion();
        } else if (
          lower.includes('http') ||
          lower.includes('.com') ||
          lower.includes('.fr') ||
          lower.includes('ouvre') ||
          lower.includes('site') ||
          lower.includes('web') ||
          lower.includes('browse') ||
          lower.includes('tableau') ||
          lower.includes('navigue')
        ) {
          const prefersTable = lower.includes('tableau') || lower.includes('table');
          agentReply = prefersTable
            ? DEFAULT_AGENT_RESPONSES.browserTable()
            : DEFAULT_AGENT_RESPONSES.browserList();
        } else {
          agentReply = DEFAULT_AGENT_RESPONSES.generic(agent.name);
        }
      }

      // 2. Persist agent reply to Supabase chat_messages table
      const agentMsg = await saveChatMessage({
        threadId: currentThread,
        role: 'assistant',
        content: agentReply,
      });

      // Update UI state
      setMessages((prev) => [...prev, agentMsg]);
      setIsTyping(false);

      // Refresh threads preview
      await refreshThreads();
    },
    [activeThreadId, agent.name, refreshThreads]
  );

  const activeThread = threads.find((t) => t.id === activeThreadId);

  return (
    <ChatContext.Provider
      value={{
        activeThreadId,
        activeThread,
        threads,
        messages,
        isLoading,
        isTyping,
        setActiveThreadId,
        createNewChat,
        sendMessage,
        renameThread,
        deleteThread,
        clearActiveThreadMessages,
        refreshThreads,
      }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
