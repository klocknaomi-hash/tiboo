/**
 * RootLayout Component
 *
 * App-wide navigation shell:
 * - ThemeProvider: light/dark system color scheme synchronization
 * - Stack Navigator: headerless screen transitions
 * - AgentProvider: customizable agent profile persisted on device
 * - Inter font loading (splash stays up until fonts are ready)
 * - StatusBar: dark icons on clean white surface
 */

import React, { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { ToastProvider } from '@/context/ToastContext';
import { AgentProvider } from '@/context/AgentContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Navigation Guard
 * Listens to active auth session (Supabase or Guest bypass) and routes users:
 * - Session present: Redirects to main app tabs ('/(tabs)/chat')
 * - No session: Redirects back to sign-in screen ('/')
 */
function AuthNavigationGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    const rootSegment = segments[0] as string | undefined;
    const isAuthCallback = rootSegment === 'auth';
    const isAppScreen =
      rootSegment === '(tabs)' || rootSegment === 'history' || rootSegment === 'home';

    if (isAuthCallback) {
      // Let auth callback process URL without interruption
      return;
    }

    if (session) {
      if (!isAppScreen) {
        router.replace('/(tabs)/chat' as any);
      }
    } else {
      if (isAppScreen) {
        router.replace('/' as any);
      }
    }
  }, [segments, session, isLoading, router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AuthNavigationGuard />
        <AgentProvider>
          <ToastProvider>
            <ChatProvider>
              <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="history" options={{ headerShown: false }} />
                <Stack.Screen name="home" options={{ headerShown: false }} />
                <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
              </Stack>
              <StatusBar style="dark" />
            </ChatProvider>
          </ToastProvider>
        </AgentProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

