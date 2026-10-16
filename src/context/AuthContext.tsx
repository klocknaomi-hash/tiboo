/**
 * Auth Context & Provider
 *
 * Tracks the current Supabase session, user object, and synced profile
 * across the application. Subscribes to Supabase's auth state so
 * sign-in / sign-out / token refresh updates reactive components immediately.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import {
  getUserProfile,
  saveUserProfile,
  signOut as authSignOut,
  UserProfile,
} from '@/lib/auth';

const GUEST_STORAGE_KEY = '@tiboo_guest_session';

const GUEST_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  app_metadata: { provider: 'guest' },
  user_metadata: { name: 'Invité Tiboo', full_name: 'Invité Tiboo' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'invite@tiboo.ai',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
};

const GUEST_SESSION: Session = {
  access_token: 'mock-access-token-guest',
  refresh_token: 'mock-refresh-token-guest',
  expires_in: 3600 * 24 * 365,
  expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 365,
  token_type: 'bearer',
  user: GUEST_USER,
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserProfile: (data: { name?: string; avatar_url?: string | null }) => Promise<void>;
  signInAsGuest: (customName?: string, customEmail?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  updateUserProfile: async () => {},
  signInAsGuest: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfileForUser = useCallback(async (u: User | null) => {
    if (!u) {
      setProfile(null);
      return;
    }

    // Immediate optimistic profile from metadata
    const optimisticProfile: UserProfile = {
      id: u.id,
      name:
        (u.user_metadata?.full_name as string | undefined) ||
        (u.user_metadata?.name as string | undefined) ||
        u.email?.split('@')[0] ||
        'User',
      email: u.email ?? null,
      avatar_url:
        (u.user_metadata?.avatar_url as string | undefined) ||
        (u.user_metadata?.picture as string | undefined) ||
        null,
    };
    setProfile(optimisticProfile);

    // Fetch DB-backed profile
    try {
      const dbProfile = await getUserProfile(u.id);
      if (dbProfile) {
        setProfile(dbProfile);
      }
    } catch {
      // Kept optimistic profile on network error
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfileForUser(user);
    }
  }, [user, fetchProfileForUser]);

  const updateUserProfile = useCallback(
    async (data: { name?: string; avatar_url?: string | null }) => {
      const currentId = user?.id || 'guest';
      const updatedProfile: UserProfile = {
        id: currentId,
        name: data.name !== undefined ? data.name : profile?.name ?? null,
        email: profile?.email ?? user?.email ?? null,
        avatar_url: data.avatar_url !== undefined ? data.avatar_url : profile?.avatar_url ?? null,
      };
      setProfile(updatedProfile);

      if (user) {
        try {
          await saveUserProfile(
            user,
            updatedProfile.name || undefined,
            updatedProfile.avatar_url || undefined
          );
        } catch (err) {
          console.warn('[AuthContext] error saving profile to DB:', err);
        }
      }

      try {
        const raw = await AsyncStorage.getItem(GUEST_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.user) {
            parsed.user.user_metadata = {
              ...parsed.user.user_metadata,
              name: updatedProfile.name,
              full_name: updatedProfile.name,
              avatar_url: updatedProfile.avatar_url,
            };
            await AsyncStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(parsed));
          }
        }
      } catch {}
    },
    [user, profile]
  );


  const signInAsGuest = useCallback(async (customName?: string, customEmail?: string) => {
    const displayName = customName?.trim() || 'Invité Tiboo';
    const emailAddr = customEmail?.trim() || 'invite@tiboo.ai';

    const guestUser: User = {
      ...GUEST_USER,
      id: 'guest-' + Date.now(),
      email: emailAddr,
      user_metadata: {
        name: displayName,
        full_name: displayName,
      },
    };

    const guestSession: Session = {
      ...GUEST_SESSION,
      user: guestUser,
    };

    try {
      await AsyncStorage.setItem(
        GUEST_STORAGE_KEY,
        JSON.stringify({ user: guestUser, session: guestSession })
      );
    } catch (e) {
      console.warn('[AuthContext] Could not persist guest session:', e);
    }

    setSession(guestSession);
    setUser(guestUser);
    setProfile({
      id: guestUser.id,
      name: displayName,
      email: emailAddr,
      avatar_url: null,
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        // 1. Check real Supabase session
        const { data } = await supabase.auth.getSession();
        if (data?.session && isMounted) {
          setSession(data.session);
          setUser(data.session.user);
          await fetchProfileForUser(data.session.user);
          setIsLoading(false);
          return;
        }

        // 2. Check persisted guest bypass session
        const rawGuest = await AsyncStorage.getItem(GUEST_STORAGE_KEY);
        if (rawGuest && isMounted) {
          try {
            const parsed = JSON.parse(rawGuest);
            if (parsed?.session) {
              setSession(parsed.session);
              setUser(parsed.user);
              setProfile({
                id: parsed.user?.id || 'guest',
                name: parsed.user?.user_metadata?.name || 'Invité',
                email: parsed.user?.email || null,
                avatar_url: null,
              });
              setIsLoading(false);
              return;
            }
          } catch {
            // invalid json, ignore
          }
        }
      } catch (err) {
        console.warn('[AuthContext] initAuth error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    // Realtime auth listener for Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession && isMounted) {
        setSession(newSession);
        const currentUser = newSession.user;
        setUser(currentUser);
        await fetchProfileForUser(currentUser);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileForUser]);

  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(GUEST_STORAGE_KEY);
      await authSignOut();
    } catch {
      // ignore
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isLoading,
        signOut,
        refreshProfile,
        updateUserProfile,
        signInAsGuest,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

