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
import { useAgent } from '@/context/AgentContext';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/apiClient';
import { getUserTimezone } from '@/lib/cronUtils';

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
  /** Approve or refuse an action the agent paused for confirmation */
  respondToConfirmation: (messageId: string, approve: boolean) => Promise<void>;
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

  interface AgentApiReply {
    reply: string;
    requiresConfirmation?: ChatMessage['pendingConfirmation'];
  }

  /** Shows the agent's real answer, or the real error: never an invented reply. */
  const handleAgentCall = useCallback(
    async (threadId: string, call: () => Promise<AgentApiReply>) => {
      setIsTyping(true);
      try {
        const payload = await call();
        if (payload.requiresConfirmation) {
          // Not persisted: the confirmation token is short-lived.
          setMessages((prev) => [
            ...prev,
            {
              id: `confirm-${Date.now()}`,
              sender: 'agent',
              text: payload.reply,
              timestamp: formatDisplayTime(new Date().toISOString()),
              pendingConfirmation: payload.requiresConfirmation,
            },
          ]);
        } else {
          const agentMsg = await saveChatMessage({
            threadId,
            role: 'assistant',
            content: payload.reply,
          });
          setMessages((prev) => [...prev, agentMsg]);
        }
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            sender: 'system',
            text: err?.message || "L'agent n'a pas pu répondre.",
            timestamp: formatDisplayTime(new Date().toISOString()),
            isError: true,
          },
        ]);
      } finally {
        setIsTyping(false);
        await refreshThreads();
      }
    },
    [refreshThreads]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const currentThread = activeThreadId;

      // Recent conversation (errors and pending confirmations excluded)
      const history = messages
        .filter((m) => !m.isError && !m.pendingConfirmation && m.sender !== 'system')
        .slice(-20)
        .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

      const userMsg = await saveChatMessage({ threadId: currentThread, role: 'user', content: trimmed });
      setMessages((prev) => [...prev, userMsg]);

      await handleAgentCall(currentThread, () =>
        apiFetch<AgentApiReply>('/api/chat', {
          body: {
            message: trimmed,
            history,
            persona: { name: agent.name, role: agent.subtitle },
            timezone: getUserTimezone(),
          },
        })
      );
    },
    [activeThreadId, messages, agent.name, agent.subtitle, handleAgentCall]
  );

  const respondToConfirmation = useCallback(
    async (messageId: string, approve: boolean) => {
      const pending = messages.find((m) => m.id === messageId)?.pendingConfirmation;
      if (!pending) return;
      // Lock the card so the action cannot be confirmed twice.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                pendingConfirmation: undefined,
                text: approve ? `✅ Confirmé : ${pending.description}` : `✖️ Refusé : ${pending.description}`,
              }
            : m
        )
      );
      await handleAgentCall(activeThreadId, () =>
        apiFetch<AgentApiReply>('/api/chat/confirm', { body: { token: pending.token, approve } })
      );
    },
    [messages, activeThreadId, handleAgentCall]
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
        respondToConfirmation,
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
