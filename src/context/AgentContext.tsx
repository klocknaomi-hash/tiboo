/**
 * Agent Context & Provider
 *
 * Holds the customizable AI agent profile (name, role, avatar, accent color,
 * greeting) for the whole app and persists it on the device with AsyncStorage,
 * so a renamed / re-skinned agent survives app restarts.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AgentProfile } from '@/types';
import { DEFAULT_AGENT_PROFILE } from '@/constants/agentConfig';

const STORAGE_KEY = '@muse/agent-profile';

interface AgentContextType {
  agent: AgentProfile;
  updateAgent: (profile: AgentProfile) => void;
  resetAgent: () => void;
}

const AgentContext = createContext<AgentContextType>({
  agent: DEFAULT_AGENT_PROFILE,
  updateAgent: () => {},
  resetAgent: () => {},
});

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [agent, setAgent] = useState<AgentProfile>(DEFAULT_AGENT_PROFILE);

  // Restore the saved profile once on launch
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          setAgent({ ...DEFAULT_AGENT_PROFILE, ...JSON.parse(raw) });
        }
      })
      .catch(() => {});
  }, []);

  const updateAgent = useCallback((profile: AgentProfile) => {
    setAgent(profile);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile)).catch(() => {});
  }, []);

  const resetAgent = useCallback(() => {
    setAgent(DEFAULT_AGENT_PROFILE);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return (
    <AgentContext.Provider value={{ agent, updateAgent, resetAgent }}>
      {children}
    </AgentContext.Provider>
  );
};

export const useAgent = () => useContext(AgentContext);
